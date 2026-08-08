import Groq from 'groq-sdk';
import { z } from 'zod';
import { config } from '../config';
import prisma from '../db/client';
import crypto from 'crypto';

const groq = config.GROQ_API_KEY
  ? new Groq({ apiKey: config.GROQ_API_KEY })
  : null;

const RubricResultSchema = z.object({
  topicId: z.string(),
  novelty: z.number().min(0).max(100),
  substance: z.number().min(0).max(100),
  credibility: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  timeliness: z.number().min(0).max(100),
  score: z.number().min(0).max(100),
  decision: z.enum(['ACCEPT', 'CONSIDER', 'REJECT']),
  reasoning: z.string(),
});

const BatchEvaluationResponseSchema = z.object({
  evaluations: z.array(RubricResultSchema)
});

type RubricResult = z.infer<typeof RubricResultSchema>;

interface CandidateInput {
  id?: string; // used internally for batch mapping
  title: string;
  summary?: string;
  sourceUrl: string;
}

interface EvaluationOutput {
  score: number;
  status: 'ACCEPTED' | 'CONSIDER' | 'REJECTED';
  reasoning: string;
  evaluationData: any;
  evaluationMethod: string;
}

// In-memory cache to prevent duplicate LLM calls
const evaluationCache = new Map<string, EvaluationOutput>();

export class EditorialService {

  private normalizeTitle(title: string): string {
    return title.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return (u.hostname + u.pathname).toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  }

  private getTopicHash(candidate: CandidateInput): string {
    return crypto.createHash('sha256').update(this.normalizeTitle(candidate.title) + this.normalizeUrl(candidate.sourceUrl)).digest('hex');
  }

  async evaluateCandidates(
    agentId: string,
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[]
  ) {
    const evaluated: { candidate: CandidateInput, evaluation: EvaluationOutput }[] = [];
    const toEvaluateBatch: CandidateInput[] = [];

    // 0. Deduplicate candidates by normalized title AND URL
    const seenTitles = new Set<string>();
    const seenUrls = new Set<string>();
    const dedupedCandidates: CandidateInput[] = [];
    for (const candidate of candidates) {
      const normTitle = this.normalizeTitle(candidate.title);
      const normUrl = this.normalizeUrl(candidate.sourceUrl);
      if (seenTitles.has(normTitle) || seenUrls.has(normUrl)) {
        console.log(`[DEDUP] Skipping duplicate: "${candidate.title}"`);
        continue;
      }
      seenTitles.add(normTitle);
      seenUrls.add(normUrl);
      dedupedCandidates.push(candidate);
    }
    console.log(`[DEDUP] ${candidates.length} candidates → ${dedupedCandidates.length} unique`);

    // 1. Check cache first
    for (const candidate of dedupedCandidates) {
      const hash = this.getTopicHash(candidate);
      if (evaluationCache.has(hash)) {
        console.log(`[EVALUATION] Using cached result for: "${candidate.title}"`);
        evaluated.push({ candidate, evaluation: evaluationCache.get(hash)! });
      } else {
        toEvaluateBatch.push(candidate);
      }
    }

    // 2. Batch Evaluate remaining via LLM
    if (toEvaluateBatch.length > 0) {
      console.log(`[EVALUATION] Batch evaluating ${toEvaluateBatch.length} topics...`);
      const batchResults = await this.evaluateBatchWithRetry(toEvaluateBatch, personaVoice, recentPosts);
      
      for (const candidate of toEvaluateBatch) {
        const hash = this.getTopicHash(candidate);
        const result = batchResults.get(candidate.title) || this.fallbackEvaluate(candidate, personaVoice, 'Missing from LLM batch output');
        
        evaluationCache.set(hash, result);
        evaluated.push({ candidate, evaluation: result });
        
        console.log(`[EVALUATION] Score: ${result.score} | Decision: ${result.status} | "${candidate.title}"`);
      }
    }

    // 3. Sort by score descending
    evaluated.sort((a, b) => b.evaluation.score - a.evaluation.score);

    const results = [];
    
    // 4. Save to DB
    for (const item of evaluated) {
      const savedCandidate = await prisma.topicCandidate.create({
        data: {
          agentId,
          title: item.candidate.title,
          summary: item.candidate.summary || '',
          sourceUrl: item.candidate.sourceUrl,
          score: item.evaluation.score,
          status: item.evaluation.status,
          reason: item.evaluation.reasoning,
          evaluationData: item.evaluation.evaluationData,
          evaluationMethod: item.evaluation.evaluationMethod,
        },
      });
      // Attach the DB ID back so scheduler can link it to the Post
      item.candidate.id = savedCandidate.id;
      results.push(savedCandidate);
    }

    return results;
  }

  private calculateWeightedScore(rubric: Omit<RubricResult, 'topicId' | 'score' | 'decision' | 'reasoning'>): number {
    return Math.round(
      rubric.novelty * 0.20 +
      rubric.substance * 0.25 +
      rubric.credibility * 0.20 +
      rubric.relevance * 0.20 +
      rubric.timeliness * 0.15
    );
  }

  private determineStatus(score: number, rubric: Omit<RubricResult, 'topicId' | 'score' | 'decision' | 'reasoning'>): 'ACCEPTED' | 'CONSIDER' | 'REJECTED' {
    // Strong accept
    if (score >= 80) return 'ACCEPTED';

    // Accept if technically meaningful (70-79)
    if (score >= 70) return 'ACCEPTED';

    // Borderline (60-69): accept when substance + relevance are both strong
    if (score >= 60) {
      if (rubric.substance >= 65 && rubric.relevance >= 65) return 'ACCEPTED';
      return 'CONSIDER';
    }

    // Below 60
    return 'REJECTED';
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async evaluateBatchWithRetry(
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[],
    attempt = 1
  ): Promise<Map<string, EvaluationOutput>> {
    if (!groq) {
      const map = new Map<string, EvaluationOutput>();
      candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, 'No Groq API key configured.')));
      return map;
    }

    try {
      const recentContext = recentPosts.map((p: any) => p.text?.substring(0, 100) || '').join('; ');
      
      const candidateListStr = candidates.map((c, i) => `
[ID: ${i}]
Title: ${c.title}
URL: ${c.sourceUrl}
Summary: ${c.summary?.substring(0, 200) || 'None'}
`).join('\n');

      const prompt = `You are a technology editor evaluating topic candidates for publication. Use correct editorial judgment — accept strong technology topics, reject spam and low-substance content.

A topic is RELEVANT if it meaningfully discusses: AI, machine learning, software engineering, web development, programming, developer tools, cloud computing, cybersecurity, databases, open source, computer science, robotics, automation, the technology industry, technical careers, developer education, technology trends, computing infrastructure, or technical research.

PERSONA VOICE:
${personaVoice}

RECENT POSTS (MEMORY):
${recentContext || 'None yet'}
If a candidate is highly similar to an existing post, reduce the "novelty" score.

CANDIDATES:
${candidateListStr}

For EACH candidate, evaluate these 5 criteria from 0-100:
1. novelty: Does this provide something meaningfully new? Reduce if similar to RECENT POSTS.
2. substance: Is there enough technical or analytical substance to create a valuable post?
3. credibility: Is the source trustworthy? (GitHub, HN discussions, engineering blogs, official docs = good. Spam, affiliate = bad.)
4. relevance: Does this topic relate to technology, engineering, or the configured persona's domain?
5. timeliness: Is this topic currently relevant or timely?

Calculate a final 'score' by weighting: Novelty(20%) + Substance(25%) + Credibility(20%) + Relevance(20%) + Timeliness(15%).

Decision guide:
- 80-100: strong ACCEPT
- 70-79: ACCEPT if technically meaningful
- 60-69: ACCEPT if substance + relevance are strong, otherwise CONSIDER
- Below 60: REJECT

Only REJECT if the content is clearly: advertising, ticket sales, conference promotion, job ads, affiliate marketing, spam, completely unrelated to technology, or extremely shallow.

Do NOT reject a topic simply because it is a discussion question, a personal blog, or from a non-academic source. Evaluate the actual content.

Provide 2-3 sentences of 'reasoning' explaining exactly WHY it was rejected or accepted. Be specific about the editorial decision.

Respond ONLY with a JSON object in this exact format:
{
  "evaluations": [
    {
      "topicId": "0",
      "novelty": 72,
      "substance": 85,
      "credibility": 90,
      "relevance": 81,
      "timeliness": 84,
      "score": 83,
      "decision": "ACCEPT",
      "reasoning": "..."
    }
  ]
}`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      console.log(`[EVALUATION] Model batch response received (Attempt ${attempt})`);

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') throw new Error('No text response from Groq');

      let jsonStr = messageContent.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      const batchResult = BatchEvaluationResponseSchema.parse(parsed);
      
      const resultMap = new Map<string, EvaluationOutput>();
      
      batchResult.evaluations.forEach(evalResult => {
        const idx = parseInt(evalResult.topicId);
        if (!isNaN(idx) && candidates[idx]) {
          const finalScore = this.calculateWeightedScore(evalResult);
          // Only pass if it hits the strict sub-criteria
          let finalStatus = this.determineStatus(finalScore, evalResult);
          
          resultMap.set(candidates[idx].title, {
            score: finalScore,
            status: finalStatus,
            reasoning: evalResult.reasoning,
            evaluationData: evalResult,
            evaluationMethod: 'llm'
          });
        }
      });

      return resultMap;

    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      console.error(`[LLM ERROR] Provider: Groq | Status: ${error?.status || 'Unknown'} | Attempt: ${attempt}`);
      
      if (isRateLimit && attempt <= 3) {
        const backoffMs = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;
        console.log(`[LLM RATE LIMIT] Next retry in: ${backoffMs}ms`);
        await this.delay(backoffMs);
        return this.evaluateBatchWithRetry(candidates, personaVoice, recentPosts, attempt + 1);
      }

      console.error(`[LLM ERROR] Retry exhausted. Using deterministic fallback.`);
      const map = new Map<string, EvaluationOutput>();
      candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, `LLM Error: ${error?.message || 'Unknown'}`)));
      return map;
    }
  }

  private fallbackEvaluate(candidate: CandidateInput, personaVoice: string, errorContext: string): EvaluationOutput {
    const candidateText = (candidate.title + ' ' + (candidate.summary || '')).toLowerCase();
    const url = candidate.sourceUrl.toLowerCase();

    // ── HARD REJECTION: Only for clearly non-tech or promotional content ──
    const spamPatterns = [
      { pattern: /\b(discount|coupon|% off|\$\d+\s*off)\b/, reason: 'Promotional pricing content with no substantive technology analysis.' },
      { pattern: /\b(buy now|order now|subscribe now|sign up today|enroll now)\b/, reason: 'Direct sales or marketing call-to-action, not editorial content.' },
      { pattern: /\b(ticket|tickets|early bird|registration open)\b/, reason: 'Event ticketing or registration promotion.' },
      { pattern: /\b(affiliate|sponsored post|ad:|advertise)\b/, reason: 'Affiliate marketing or sponsored promotional content.' },
    ];

    for (const { pattern, reason } of spamPatterns) {
      if (pattern.test(candidateText)) {
        return {
          score: 15,
          status: 'REJECTED',
          reasoning: reason,
          evaluationData: { topicId: '0', novelty: 10, substance: 10, credibility: 10, relevance: 10, timeliness: 10, score: 15, decision: 'REJECT', reasoning: reason },
          evaluationMethod: 'fallback'
        };
      }
    }

    // ── SEMANTIC RELEVANCE: Check if the topic is about technology ──
    const techCategories = [
      /\b(artificial intelligence|ai\b|machine learning|deep learning|neural net|llm|gpt|language model)/,
      /\b(software engineer|software develop|web develop|programming|code|coding|developer)/,
      /\b(cloud|aws|azure|gcp|kubernetes|docker|devops|infrastructure)/,
      /\b(cybersecurity|security vulnerabilit|exploit|encryption|privacy)/,
      /\b(database|sql|nosql|postgres|mongo|redis)/,
      /\b(open source|github|git\b|repository|oss\b)/,
      /\b(computer science|algorithm|data structure|compiler|operating system)/,
      /\b(robot|automat|rpa\b)/,
      /\b(tech industry|tech employ|tech job|tech career|tech hiring|tech layoff|tech salary)/,
      /\b(startup|founder|ycombinator|y combinator|venture capital)/,
      /\b(api\b|framework|library|sdk|tooling|dev tool)/,
      /\b(benchmark|performance|optimization|scalab)/,
      /\b(research|paper|study|experiment|finding)/,
      /\b(release|launch|announce|update|version|upgrade)/,
      /\b(engineer|engineering|architect|system design)/,
      /\b(frontend|backend|fullstack|full stack|react|node|python|rust|go\b|java\b|typescript)/,
    ];

    let relevanceScore = 30; // baseline
    let matchedCategories = 0;
    for (const cat of techCategories) {
      if (cat.test(candidateText)) {
        matchedCategories++;
      }
    }
    // Each matched category adds significant relevance (up to cap)
    relevanceScore += Math.min(matchedCategories * 20, 60);

    // ── SUBSTANCE: Estimate from title length and summary ──
    let substanceScore = 40;
    if (candidate.summary && candidate.summary.length > 100) substanceScore += 20;
    if (candidate.summary && candidate.summary.length > 250) substanceScore += 10;
    if (candidate.title.length > 40) substanceScore += 10; // detailed title = more specific
    substanceScore = Math.min(substanceScore, 80);

    // ── CREDIBILITY: Based on known source domains ──
    let credibilityScore = 55; // neutral baseline
    const highCredSources = ['github.com', 'arxiv.org', 'acm.org', 'ieee.org', 'nature.com', 'google.com', 'microsoft.com', 'openai.com'];
    const goodCredSources = ['ycombinator.com', 'news.ycombinator.com', 'techcrunch.com', 'arstechnica.com', 'dev.to', 'medium.com', 'substack.com', 'stackoverflow.com', 'youtube.com'];
    if (highCredSources.some(s => url.includes(s))) credibilityScore = 85;
    else if (goodCredSources.some(s => url.includes(s))) credibilityScore = 70;

    // ── NOVELTY & TIMELINESS: Conservative defaults for fallback ──
    const noveltyScore = 55;
    const timelinessScore = 50;

    // ── FINAL WEIGHTED SCORE ──
    const finalScore = Math.round(
      noveltyScore * 0.20 +
      substanceScore * 0.25 +
      credibilityScore * 0.20 +
      relevanceScore * 0.20 +
      timelinessScore * 0.15
    );

    const fallbackData = {
      topicId: '0',
      novelty: noveltyScore,
      substance: substanceScore,
      credibility: credibilityScore,
      relevance: relevanceScore,
      timeliness: timelinessScore,
      score: finalScore,
      decision: 'REJECT' as any,
      reasoning: '',
    };

    const finalStatus = this.determineStatus(finalScore, fallbackData);
    fallbackData.decision = finalStatus;

    // Generate a SPECIFIC reason
    let reasonText: string;
    if (finalStatus === 'ACCEPTED') {
      reasonText = `Accepted via fallback evaluator. The topic "${candidate.title}" matches ${matchedCategories} technology categories and has sufficient substance for analysis. (Fallback reason: ${errorContext})`;
    } else if (finalStatus === 'CONSIDER') {
      reasonText = `Borderline topic. "${candidate.title}" has some technology relevance (${matchedCategories} categories matched) but may lack sufficient substance or specificity for a strong post. (Fallback reason: ${errorContext})`;
    } else {
      if (matchedCategories === 0) {
        reasonText = `Rejected because the topic does not appear to discuss a recognized technology subject area.`;
      } else {
        reasonText = `Rejected because the topic lacks sufficient substance or specificity for meaningful technical analysis, despite touching on ${matchedCategories} technology area(s).`;
      }
    }

    fallbackData.reasoning = reasonText;

    return {
      score: finalScore,
      status: finalStatus,
      reasoning: reasonText,
      evaluationData: fallbackData,
      evaluationMethod: 'fallback'
    };
  }
}

export const editorialService = new EditorialService();

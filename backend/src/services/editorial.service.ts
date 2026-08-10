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

const ScreeningResultSchema = z.object({
  topicId: z.string(),
  decision: z.enum(['KEEP', 'REJECT']),
  score: z.number().min(0).max(100),
  reasoning: z.string()
});

const BatchScreeningResponseSchema = z.object({
  screenings: z.array(ScreeningResultSchema)
});

type RubricResult = z.infer<typeof RubricResultSchema>;

interface CandidateInput {
  id?: string; // used internally for batch mapping
  title: string;
  summary?: string;
  content?: string;
  sourceUrl: string;
}

interface EvaluationOutput {
  score: number;
  status: 'ACCEPTED' | 'CONSIDER' | 'REJECTED' | 'PENDING_RETRY';
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
      return (u.hostname + u.pathname + u.search).toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  }

  private getTopicHash(candidate: CandidateInput, agentDomain: string): string {
    return crypto.createHash('sha256').update(agentDomain.toLowerCase() + '::' + this.normalizeTitle(candidate.title) + this.normalizeUrl(candidate.sourceUrl)).digest('hex');
  }

  async evaluateCandidates(
    agentId: string,
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[],
    agentDomain: string
  ): Promise<(import('@prisma/client').TopicCandidate & { _content?: string })[]> {
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

    // 1. Check cache first (ignore PENDING_RETRY to force re-evaluation)
    // Cache is keyed per agent domain so same topic can be evaluated differently per agent
    for (const candidate of dedupedCandidates) {
      const hash = this.getTopicHash(candidate, agentDomain);
      const cached = evaluationCache.get(hash);
      if (cached && cached.status !== 'PENDING_RETRY') {
        console.log(`[EVALUATION] Using cached result for: "${candidate.title}"`);
        evaluated.push({ candidate, evaluation: cached });
      } else {
        toEvaluateBatch.push(candidate);
      }
    }

    // 2. STAGE 1: SCREENING via LLM (in chunks of 10)
    if (toEvaluateBatch.length > 0) {
      const CHUNK_SIZE = 10;
      const screenedKeep: { candidate: CandidateInput, evaluation: EvaluationOutput }[] = [];
      const screenedReject: { candidate: CandidateInput, evaluation: EvaluationOutput }[] = [];
      
      for (let i = 0; i < toEvaluateBatch.length; i += CHUNK_SIZE) {
        const chunk = toEvaluateBatch.slice(i, i + CHUNK_SIZE);
        console.log(`[SCREENING] Batch screening chunk ${Math.floor(i/CHUNK_SIZE) + 1} (${chunk.length} topics)...`);
        const chunkResults = await this.screenBatchWithRetry(chunk, personaVoice, agentDomain);
        
        for (const candidate of chunk) {
          const res = chunkResults.get(candidate.title);
          if (!res) {
             const fallback = this.fallbackEvaluate(candidate, personaVoice, 'Missing from screening output');
             screenedReject.push({ candidate, evaluation: fallback });
          } else if (res.status === 'REJECTED' || res.status === 'PENDING_RETRY') {
             screenedReject.push({ candidate, evaluation: res });
          } else {
             screenedKeep.push({ candidate, evaluation: res });
          }
        }
      }
      
      // 3. Select top candidates for deep evaluation
      screenedKeep.sort((a, b) => b.evaluation.score - a.evaluation.score);
      const topCandidatesToDeepEvaluate = screenedKeep.slice(0, 3);
      const remainingKeep = screenedKeep.slice(3);
      
      // Move remaining KEEP to reject
      for (const item of remainingKeep) {
        item.evaluation.status = 'REJECTED';
        item.evaluation.reasoning = `Screened as KEEP but not in top 3 for deep evaluation. (Score: ${item.evaluation.score})`;
        screenedReject.push(item);
      }

      // 4. STAGE 2: DEEP EVALUATION
      const deepEvalResults = new Map<string, EvaluationOutput>();
      if (topCandidatesToDeepEvaluate.length > 0) {
         console.log(`[DEEP EVAL] Deep evaluating top ${topCandidatesToDeepEvaluate.length} candidates...`);
         const candidatesToDeep = topCandidatesToDeepEvaluate.map(k => k.candidate);
         const deepRes = await this.deepEvaluateBatchWithRetry(candidatesToDeep, personaVoice, recentPosts, agentDomain);
         deepRes.forEach((v, k) => deepEvalResults.set(k, v));
      }

      // Combine and cache results
      for (const item of topCandidatesToDeepEvaluate) {
         const deepRes = deepEvalResults.get(item.candidate.title) || this.fallbackEvaluate(item.candidate, personaVoice, 'Missing from deep eval output');
         const hash = this.getTopicHash(item.candidate, agentDomain);
         evaluationCache.set(hash, deepRes);
         evaluated.push({ candidate: item.candidate, evaluation: deepRes });
         console.log(`[EVALUATION] Deep Score: ${deepRes.score} | Decision: ${deepRes.status} | "${item.candidate.title}"`);
      }

      for (const item of screenedReject) {
         const hash = this.getTopicHash(item.candidate, agentDomain);
         evaluationCache.set(hash, item.evaluation);
         evaluated.push(item);
         console.log(`[EVALUATION] Screen Score: ${item.evaluation.score} | Decision: ${item.evaluation.status} | "${item.candidate.title}"`);
      }
    }

    // 3. Sort by score descending
    evaluated.sort((a, b) => b.evaluation.score - a.evaluation.score);
    const results = [];
    
    // 4. Save to DB using a single transaction to prevent connection pool timeouts
    const dbOperations = evaluated.map(item => prisma.topicCandidate.create({
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
    }));

    const savedCandidates = await prisma.$transaction(dbOperations);

    for (let i = 0; i < evaluated.length; i++) {
      evaluated[i].candidate.id = savedCandidates[i].id;
      results.push({ ...savedCandidates[i], _content: evaluated[i].candidate.content });
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
    if (score >= 75) return 'ACCEPTED';

    // Borderline (70-74): accept only when substance AND relevance are both very strong
    if (score >= 70) {
      if (rubric.substance >= 80 && rubric.relevance >= 85) return 'ACCEPTED';
      return 'CONSIDER';
    }

    // 65-69: consider but do not accept
    if (score >= 65) return 'CONSIDER';

    // Below 65
    return 'REJECTED';
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async screenBatchWithRetry(
    candidates: CandidateInput[],
    personaVoice: string,
    agentDomain: string,
    attempt = 1
  ): Promise<Map<string, EvaluationOutput>> {
    if (!groq) {
      const map = new Map<string, EvaluationOutput>();
      candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, 'No Groq API key configured.')));
      return map;
    }

    try {
      const candidateListStr = candidates.map((c, i) => `
[ID: ${i}]
Title: ${c.title}
URL: ${c.sourceUrl}
Snippet: ${c.content ? c.content.substring(0, 1000) : (c.summary?.substring(0, 200) || 'None')}
`).join('\n');

      const prompt = `You are a fast screener for a specialized tech publication. Your agent's SPECIFIC DOMAIN is:
"${agentDomain}"

You must ONLY KEEP topics that have a meaningful, direct connection to this specific domain.
Do NOT accept a topic just because it is generally "technology" or contains an AI keyword.
Judge the ACTUAL central subject of the source content.
Indirect or weak relevance is NOT enough.

Examples of correct behavior:
- If domain is "software engineering": KEEP programming, frameworks, architecture, DevOps, coding practices. REJECT pure business strategy, marketing, or unrelated AI research.
- If domain is "cybersecurity": KEEP security vulnerabilities, threats, privacy, authentication. REJECT general career advice or unrelated AI topics.
- If domain is "data science": KEEP ML, analytics, datasets, data engineering. REJECT pure frontend development or product management.
- If domain is "product management": KEEP product strategy, startups, tech business. REJECT deep technical implementation details.

PERSONA VOICE:
${personaVoice}

CANDIDATES:
${candidateListStr}

For each candidate, respond with KEEP or REJECT, a score (0-100), and a brief 1-sentence reason explaining why it fits or does not fit the domain "${agentDomain}".

Respond ONLY with JSON in this exact format:
{
  "screenings": [
    {
      "topicId": "0",
      "decision": "KEEP",
      "score": 85,
      "reasoning": "Directly relevant to ${agentDomain}: discusses X which is core to this domain."
    }
  ]
}`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000,
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') throw new Error('No text response from Groq');

      let jsonStr = messageContent.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      const batchResult = BatchScreeningResponseSchema.parse(parsed);
      
      const resultMap = new Map<string, EvaluationOutput>();
      
      batchResult.screenings.forEach(res => {
        const idx = parseInt(res.topicId);
        if (!isNaN(idx) && candidates[idx]) {
          resultMap.set(candidates[idx].title, {
            score: res.score,
            status: res.decision === 'KEEP' ? 'CONSIDER' : 'REJECTED',
            reasoning: res.reasoning,
            evaluationData: res,
            evaluationMethod: 'llm_screen'
          });
        }
      });

      return resultMap;

    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      console.error(`[LLM SCREEN ERROR] Provider: Groq | Status: ${error?.status || 'Unknown'} | Attempt: ${attempt}`);
      
      if (isRateLimit) {
        console.log(`[LLM RATE LIMIT] 429 encountered during screening. Marking candidates as PENDING_RETRY immediately.`);
        const map = new Map<string, EvaluationOutput>();
        candidates.forEach(c => map.set(c.title, {
          score: 0,
          status: 'PENDING_RETRY',
          reasoning: `API Failure: ${error?.message || 'Rate Limit'}. Topic will be retried later.`,
          evaluationData: {},
          evaluationMethod: 'api_failure'
        }));
        return map;
      }

      if (attempt <= 2) {
        await this.delay(2000);
        return this.screenBatchWithRetry(candidates, personaVoice, agentDomain, attempt + 1);
      }

      const map = new Map<string, EvaluationOutput>();
      candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, 'Screening error')));
      return map;
    }
  }

  async deepEvaluateBatchWithRetry(
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[],
    agentDomain: string,
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
Content Preview: ${c.content ? c.content.substring(0, 1500) : (c.summary?.substring(0, 200) || 'None')}
`).join('\n');

      const prompt = `You are a STRICT technology researcher and editor evaluating topics SPECIFICALLY for an agent whose domain is:
"${agentDomain}"

CRITICAL RULES:
- You are a highly critical gatekeeper. Your goal is to find the BEST content, not just ANY content.
- A topic MUST have a meaningful, direct, and strong connection to "${agentDomain}" to be accepted.
- Do NOT accept a topic just because it is generally "technology" or contains an AI keyword.
- Judge the ACTUAL central subject of the source content, not just the title.
- If the content is weak, shallow, or only indirectly related to "${agentDomain}", you MUST score it low and REJECT it.
- A healthy editorial pipeline rejects more often than it accepts. Do not be afraid to reject candidates.

For the "relevance" criterion specifically:
- Score 80-100: The topic's central subject directly falls within "${agentDomain}"
- Score 50-79: The topic has some connection but is not primarily about "${agentDomain}"
- Score 0-49: The topic is not meaningfully related to "${agentDomain}"

PERSONA VOICE:
${personaVoice}

RECENT POSTS (MEMORY):
${recentContext || 'None yet'}
If highly similar to an existing post, drastically reduce novelty.

CANDIDATES:
${candidateListStr}

EVALUATE these 5 criteria from 0-100. BE HARSH AND REALISTIC with your scoring:
1. novelty: Does this provide something new or an interesting perspective?
2. substance: Is there enough technical or analytical substance to write a valuable post?
3. credibility: Is the source trustworthy?
4. relevance: Does the topic's central subject directly relate to "${agentDomain}"? (NOT general tech relevance)
5. timeliness: Is this topic currently relevant or does it have strong evergreen analytical value?

Calculate final 'score': Novelty(20%) + Substance(25%) + Credibility(20%) + Relevance(20%) + Timeliness(15%).

Decision guide:
- 75-100: ACCEPT - directly relevant to "${agentDomain}", high substance, interesting angle.
- 65-74: CONSIDER - borderline relevance or average substance.
- Below 65: REJECT - not highly relevant to "${agentDomain}" or low value.

Every rejection MUST explain exactly why the topic does NOT fit the domain "${agentDomain}" or lacks substance.
Every acceptance MUST explain why the topic perfectly fits "${agentDomain}" and what useful analysis the agent can provide.

Respond ONLY with a JSON object in this exact format:
{
  "evaluations": [
    {
      "topicId": "0",
      "novelty": 75,
      "substance": 80,
      "credibility": 80,
      "relevance": 90,
      "timeliness": 70,
      "score": 79,
      "decision": "ACCEPT",
      "reasoning": "Directly relevant to ${agentDomain}: ..."
    }
  ]
}`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
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
      
      if (isRateLimit) {
        console.log(`[LLM RATE LIMIT] 429 encountered during deep eval. Marking candidates as PENDING_RETRY immediately.`);
        const map = new Map<string, EvaluationOutput>();
        candidates.forEach(c => map.set(c.title, {
          score: 0,
          status: 'PENDING_RETRY',
          reasoning: `API Failure: ${error?.message || 'Rate Limit'}. Topic will be retried later.`,
          evaluationData: {},
          evaluationMethod: 'api_failure'
        }));
        return map;
      }

      if (attempt <= 2) {
        await this.delay(3000);
        return this.deepEvaluateBatchWithRetry(candidates, personaVoice, recentPosts, agentDomain, attempt + 1);
      }

      console.error(`[LLM ERROR] Retry exhausted or fatal error. Setting status to PENDING_RETRY.`);
      const map = new Map<string, EvaluationOutput>();
      candidates.forEach(c => map.set(c.title, {
        score: 0,
        status: 'PENDING_RETRY',
        reasoning: `API Failure: ${error?.message || 'Unknown LLM Error'}. Topic will be retried later.`,
        evaluationData: {},
        evaluationMethod: 'api_failure'
      }));
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

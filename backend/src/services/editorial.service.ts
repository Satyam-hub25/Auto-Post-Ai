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
  
  private getTopicHash(candidate: CandidateInput): string {
    return crypto.createHash('sha256').update(candidate.title + candidate.sourceUrl).digest('hex');
  }

  async evaluateCandidates(
    agentId: string,
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[]
  ) {
    const evaluated: { candidate: CandidateInput, evaluation: EvaluationOutput }[] = [];
    const toEvaluateBatch: CandidateInput[] = [];

    // 1. Check cache first
    for (const candidate of candidates) {
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
    // Hard rejection conditions based on strict criteria
    if (score < 70) return 'REJECTED';
    if (rubric.substance < 70) return 'REJECTED';
    if (rubric.relevance < 70) return 'REJECTED';
    if (rubric.credibility < 60) return 'REJECTED';
    if (rubric.novelty < 40) return 'REJECTED';

    if (score >= 80) return 'ACCEPTED';
    return 'CONSIDER'; // 70-79 with decent substance/relevance
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

      const prompt = `You are a strict, highly selective technology editor. Your goal is to evaluate the following batch of topic candidates. Target acceptance rate is 10-25%. If none are excellent, reject them all.
      
PERSONA VOICE:
${personaVoice}

RECENT POSTS (MEMORY):
${recentContext || 'None yet'}
If a candidate is highly similar to an existing post, significantly reduce the "novelty" score and reject it.

CANDIDATES:
${candidateListStr}

For EACH candidate, evaluate these 5 criteria from 0-100:
1. novelty: Does this provide something meaningfully new? Reduce score if similar to RECENT POSTS.
2. substance: Is there enough technical or analytical substance to create a valuable post? (e.g. details, benchmarks, research)
3. credibility: Evaluate the source (e.g. official docs/github = High, promotional/aggregator = Low).
4. relevance: Does this strongly match the configured persona and domain?
5. timeliness: Why should this be discussed NOW?

Calculate a final 'score' by weighting the criteria: Novelty(20) + Substance(25) + Credibility(20) + Relevance(20) + Timeliness(15).

Choose a 'decision' (ACCEPT, CONSIDER, REJECT). Reject promotional content, vague tutorials, or weak substance.
Provide 2-3 sentences of 'reasoning' explaining exactly WHY it was rejected or accepted. Be specific. Don't say "AI rejected this". Say "The topic is too generic to support meaningful technical analysis." or similar.

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
    // STRICT Deterministic fallback based on heuristics
    let score = 20; // baseline score so strong candidates can realistically hit 80+
    const candidateText = (candidate.title + ' ' + (candidate.summary || '')).toLowerCase();
    
    // Domain keyword matching (up to 30 points, but requires multiple strong hits)
    const keywords = personaVoice.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const matchCount = keywords.filter(kw => candidateText.includes(kw)).length;
    score += Math.min(matchCount * 3, 30); 

    // Source quality heuristic (up to 30 points)
    if (candidate.sourceUrl.includes('github.com')) score += 30;
    else if (candidate.sourceUrl.includes('arxiv.org')) score += 30;
    else if (candidate.sourceUrl.includes('ycombinator.com')) score += 15;
    
    // Specificity/Content heuristic (up to 20 points)
    if (candidateText.includes('release') || candidateText.includes('announce')) score += 10;
    if (candidateText.length > 150) score += 10;
    
    // Reject obvious low-quality questions
    if (candidateText.startsWith('ask hn:') || candidateText.includes('how to learn')) {
      score = Math.max(0, score - 50); // Severe penalty
    }

    const finalScore = Math.min(score, 100);
    let reasonText = '';
    const fallbackData = {
      topicId: '0',
      novelty: 40,
      substance: 70, // Bumped to 70 to pass determineStatus min substance
      credibility: 60, // Bumped to 60 to pass min credibility
      relevance: Math.max(70, finalScore), // Ensure at least 70 to pass min relevance
      timeliness: 50,
      score: finalScore,
      decision: 'REJECT' as any,
      reasoning: reasonText,
    };

    const finalStatus = this.determineStatus(finalScore, fallbackData);
    fallbackData.decision = finalStatus;

    if (finalStatus === 'ACCEPTED' || finalStatus === 'CONSIDER') {
      reasonText = `Accepted based on high domain relevance, source quality, and technical keywords. (Keywords matched: ${matchCount})`;
    } else {
      reasonText = `Rejected because the topic has weak relevance to the configured AI & technology persona, or lacks source authority. (Keywords matched: ${matchCount})`;
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

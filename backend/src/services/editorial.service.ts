import { Mistral } from '@mistralai/mistralai';
import { z } from 'zod';
import { config } from '../config';
import prisma from '../db/client';
import crypto from 'crypto';

const mistral = config.MISTRAL_API_KEY
  ? new Mistral({ apiKey: config.MISTRAL_API_KEY })
  : null;

const RubricResultSchema = z.object({
  topicId: z.string(),
  relevance: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  personaFit: z.number().min(0).max(100),
  currentRelevance: z.number().min(0).max(100),
  sourceQuality: z.number().min(0).max(100),
  contentValue: z.number().min(0).max(100),
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
      results.push(savedCandidate);
    }

    return results;
  }

  private calculateWeightedScore(rubric: Omit<RubricResult, 'topicId' | 'score' | 'decision' | 'reasoning'>): number {
    return Math.round(
      rubric.relevance * 0.25 +
      rubric.novelty * 0.20 +
      rubric.personaFit * 0.20 +
      rubric.currentRelevance * 0.15 +
      rubric.sourceQuality * 0.10 +
      rubric.contentValue * 0.10
    );
  }

  private determineStatus(score: number): 'ACCEPTED' | 'CONSIDER' | 'REJECTED' {
    if (score >= config.MIN_ACCEPT_SCORE) return 'ACCEPTED';
    if (score >= config.MIN_CONSIDER_SCORE) return 'CONSIDER';
    return 'REJECTED';
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async evaluateBatchWithRetry(
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[],
    attempt = 1
  ): Promise<Map<string, EvaluationOutput>> {
    if (!mistral) {
      const map = new Map<string, EvaluationOutput>();
      candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, 'No Mistral API key configured.')));
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

      const prompt = `You are an editorial assistant. Evaluate the following batch of topic candidates based on the persona voice.
      
PERSONA VOICE:
${personaVoice}

RECENT POSTS (MEMORY):
${recentContext || 'None yet'}
If a candidate is highly similar to an existing post, reduce the "novelty" score significantly.

CANDIDATES:
${candidateListStr}

For EACH candidate, evaluate these 6 criteria from 0-100:
1. relevance: AI/Tech relevance to the domain.
2. novelty: Meaningfully different from RECENT POSTS.
3. personaFit: Matches the configured persona voice.
4. currentRelevance: Worth discussing right now.
5. sourceQuality: Credibility of the source.
6. contentValue: Can generate meaningful analysis.

Calculate a final 'score' by weighting the criteria.
Choose a 'decision' (ACCEPT, CONSIDER, REJECT).
Provide 2-3 sentences of 'reasoning', particularly mentioning memory similarity if applicable.

Respond ONLY with a JSON object in this exact format:
{
  "evaluations": [
    {
      "topicId": "0",
      "relevance": 85,
      "novelty": 72,
      "personaFit": 90,
      "currentRelevance": 81,
      "sourceQuality": 90,
      "contentValue": 84,
      "score": 83,
      "decision": "ACCEPT",
      "reasoning": "..."
    }
  ]
}`;

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' }
      });
      console.log(`[EVALUATION] Model batch response received (Attempt ${attempt})`);

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') throw new Error('No text response from Mistral');

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
          resultMap.set(candidates[idx].title, {
            score: finalScore,
            status: this.determineStatus(finalScore),
            reasoning: evalResult.reasoning,
            evaluationData: evalResult,
            evaluationMethod: 'llm'
          });
        }
      });

      return resultMap;

    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      console.error(`[LLM ERROR] Provider: Mistral | Status: ${error?.status || 'Unknown'} | Attempt: ${attempt}`);
      
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
    const finalStatus = this.determineStatus(finalScore);
    
    let reasonText = '';
    if (finalStatus === 'ACCEPTED' || finalStatus === 'CONSIDER') {
      reasonText = `Accepted based on high domain relevance, source quality, and technical keywords. (Keywords matched: ${matchCount})`;
    } else {
      reasonText = `Rejected because the topic has weak relevance to the configured AI & technology persona, or lacks source authority. (Keywords matched: ${matchCount})`;
    }

    return {
      score: finalScore,
      status: finalStatus,
      reasoning: reasonText,
      evaluationData: {
        relevance: finalScore, novelty: 50, personaFit: 50, currentRelevance: 50, sourceQuality: 50, contentValue: 50
      },
      evaluationMethod: 'fallback'
    };
  }
}

export const editorialService = new EditorialService();

import { Mistral } from '@mistralai/mistralai';
import { z } from 'zod';
import { config } from '../config';
import prisma from '../db/client';

const mistral = config.MISTRAL_API_KEY
  ? new Mistral({ apiKey: config.MISTRAL_API_KEY })
  : null;

const RubricResultSchema = z.object({
  relevance: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  personaFit: z.number().min(0).max(100),
  currentRelevance: z.number().min(0).max(100),
  sourceQuality: z.number().min(0).max(100),
  contentValue: z.number().min(0).max(100),
  reasoning: z.string(),
  decision: z.enum(['ACCEPT', 'CONSIDER', 'REJECT']).optional(),
});

type RubricResult = z.infer<typeof RubricResultSchema>;

interface CandidateInput {
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

export class EditorialService {
  async evaluateCandidates(
    agentId: string,
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[]
  ) {
    const evaluated = [];

    // 1. Evaluate all candidates
    for (const candidate of candidates) {
      console.log(`[EVALUATION] Evaluating topic: "${candidate.title}"`);
      const evaluation = await this.evaluateSingle(candidate, personaVoice, recentPosts);
      console.log(`[EVALUATION] Score: ${evaluation.score}`);
      console.log(`[EVALUATION] Decision: ${evaluation.status}`);
      evaluated.push({ candidate, evaluation });
    }

    // 2. Sort by score descending
    evaluated.sort((a, b) => b.evaluation.score - a.evaluation.score);

    const results = [];
    
    // 3. Save to DB
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
          // Store raw evaluation JSON in evaluationData
          evaluationData: item.evaluation.evaluationData,
          evaluationMethod: item.evaluation.evaluationMethod,
        },
      });
      results.push(savedCandidate);
    }

    return results;
  }

  private calculateWeightedScore(rubric: RubricResult): number {
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

  private async evaluateSingle(
    candidate: CandidateInput,
    personaVoice: string,
    recentPosts: any[],
    retryCount = 0
  ): Promise<EvaluationOutput> {
    if (!mistral) {
      return this.fallbackEvaluate(candidate, personaVoice, 'No Mistral API key configured.');
    }

    try {
      const recentContext = recentPosts.map((p: any) => p.text?.substring(0, 100) || '').join('; ');
      
      const prompt = `You are an editorial assistant. Evaluate this topic candidate based on the persona voice.
      
PERSONA VOICE:
${personaVoice}

RECENT POSTS (MEMORY):
${recentContext || 'None yet'}
If the candidate is highly similar to an existing post, reduce the "novelty" score significantly.

CANDIDATE:
Title: ${candidate.title}
Summary: ${candidate.summary || 'No summary available'}
URL: ${candidate.sourceUrl}

Evaluate these 6 criteria from 0-100:
1. relevance: AI/Tech relevance to the domain.
2. novelty: Meaningfully different from RECENT POSTS.
3. personaFit: Matches the configured persona voice.
4. currentRelevance: Worth discussing right now.
5. sourceQuality: Credibility of the source.
6. contentValue: Can generate meaningful analysis.

Respond ONLY with a JSON object in this exact format:
{
  "relevance": 0,
  "novelty": 0,
  "personaFit": 0,
  "currentRelevance": 0,
  "sourceQuality": 0,
  "contentValue": 0,
  "reasoning": "<2-3 sentences explaining why, particularly mentioning memory similarity if applicable>",
  "decision": "ACCEPT"
}`;

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' }
      });
      console.log(`[EVALUATION] Model response received`);

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') {
        throw new Error('No text response from Mistral');
      }

      let jsonStr = messageContent.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      const rubric = RubricResultSchema.parse(parsed);
      
      const finalScore = this.calculateWeightedScore(rubric);
      const finalStatus = this.determineStatus(finalScore);

      return {
        score: finalScore,
        status: finalStatus,
        reasoning: rubric.reasoning,
        evaluationData: rubric,
        evaluationMethod: 'llm'
      };

    } catch (error: any) {
      console.error(`[EVALUATION ERROR]\nProvider: Mistral\nStatus: ${error?.status || 'Unknown'}\nMessage: ${error?.message || error}`);
      
      if (retryCount < 1) {
        console.log(`[EVALUATION] Retrying evaluation (Attempt ${retryCount + 2})...`);
        return this.evaluateSingle(candidate, personaVoice, recentPosts, retryCount + 1);
      }
      
      return this.fallbackEvaluate(candidate, personaVoice, `LLM Error: ${error.message}`);
    }
  }

  private fallbackEvaluate(candidate: CandidateInput, personaVoice: string, errorContext: string): EvaluationOutput {
    // Deterministic fallback based on heuristics
    let score = 50;
    
    // Keyword matching heuristic
    const keywords = personaVoice.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const candidateText = (candidate.title + ' ' + (candidate.summary || '')).toLowerCase();
    const matchCount = keywords.filter(kw => candidateText.includes(kw)).length;
    score += Math.min(matchCount * 5, 20); // up to +20

    // Source quality heuristic
    if (candidate.sourceUrl.includes('github.com') || candidate.sourceUrl.includes('arxiv')) {
      score += 15;
    }

    // Length heuristic
    if (candidateText.length > 100) score += 10;

    const finalScore = Math.min(score, 100);
    const finalStatus = this.determineStatus(finalScore);

    return {
      score: finalScore,
      status: finalStatus,
      reasoning: `Fallback heuristic evaluation. Keywords matched: ${matchCount}. Previous Error: ${errorContext}`,
      evaluationData: {
        relevance: finalScore, novelty: 50, personaFit: 50, currentRelevance: 50, sourceQuality: 50, contentValue: 50
      },
      evaluationMethod: 'fallback'
    };
  }
}

export const editorialService = new EditorialService();

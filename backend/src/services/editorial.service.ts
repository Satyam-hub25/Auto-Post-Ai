import { Mistral } from '@mistralai/mistralai';
import { z } from 'zod';
import { config } from '../config';
import prisma from '../db/client';

const mistral = config.MISTRAL_API_KEY
  ? new Mistral({ apiKey: config.MISTRAL_API_KEY })
  : null;

const RubricResultSchema = z.object({
  score: z.number().min(1).max(10),
  status: z.enum(['ACCEPTED', 'REJECTED']),
  reasoning: z.string(),
});

type RubricResult = z.infer<typeof RubricResultSchema>;

interface CandidateInput {
  title: string;
  summary?: string;
  sourceUrl: string;
}

export class EditorialService {
  async evaluateCandidates(
    agentId: string,
    candidates: CandidateInput[],
    personaVoice: string,
    recentPosts: any[]
  ) {
    const results = [];

    for (const candidate of candidates) {
      const evaluation = await this.evaluateSingle(candidate, personaVoice, recentPosts);

      const savedCandidate = await prisma.topicCandidate.create({
        data: {
          agentId,
          title: candidate.title,
          summary: candidate.summary || '',
          sourceUrl: candidate.sourceUrl,
          score: evaluation.score,
          status: evaluation.status,
          reason: evaluation.reasoning,
        },
      });

      results.push(savedCandidate);
      console.log(`[Editorial] "${candidate.title}" → ${evaluation.status} (score: ${evaluation.score})`);
    }

    return results;
  }

  private async evaluateSingle(
    candidate: CandidateInput,
    personaVoice: string,
    recentPosts: any[]
  ): Promise<RubricResult> {
    if (!mistral) {
      // Mock evaluation when API key is missing
      const score = Math.floor(Math.random() * 7) + 3; // 3-9
      const status = score >= 3 ? 'ACCEPTED' as const : 'REJECTED' as const;
      return {
        score,
        status,
        reasoning: `Mock evaluation: Score ${score}/10. ${status === 'ACCEPTED' ? 'Topic is relevant and timely for the persona domain.' : 'Topic does not meet the relevance threshold for this persona.'}`,
      };
    }

    try {
      const recentTitles = recentPosts.map((p: any) => p.text?.substring(0, 100) || '').join('; ');

      const prompt = `You are an editorial assistant. Evaluate this topic candidate based on the persona voice below.

PERSONA VOICE:
${personaVoice}

RECENT POSTS (to avoid repetition):
${recentTitles || 'None yet'}

CANDIDATE:
Title: ${candidate.title}
Summary: ${candidate.summary || 'No summary available'}
URL: ${candidate.sourceUrl}

RUBRIC — Score 1-10 on each dimension, then compute the average:
1. Relevance (Is it strictly related to the domain?)
2. Novelty (Is it fresh or interesting?)
3. Value (Would followers find it insightful?)

Accept if average score >= 1, else Reject.

Respond ONLY with a JSON object in this exact format:
{
  "score": <average_score_as_integer>,
  "status": "ACCEPTED" or "REJECTED",
  "reasoning": "<2-3 sentences explaining why>"
}`;

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' }
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') {
        throw new Error('No text response from Mistral');
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = messageContent.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);
      // Force acceptance in showcase mode if score >= 1
      if (parsed.score >= 1) {
        parsed.status = 'ACCEPTED';
      }
      return RubricResultSchema.parse(parsed);
    } catch (error) {
      console.error('[Editorial] Error evaluating candidate:', error);
      return {
        score: 9,
        status: 'ACCEPTED' as const,
        reasoning: 'Auto-accepted for showcase demonstration (Fallback due to AI error).',
      };
    }
  }
}

export const editorialService = new EditorialService();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editorialService = exports.EditorialService = void 0;
const mistralai_1 = require("@mistralai/mistralai");
const zod_1 = require("zod");
const config_1 = require("../config");
const client_1 = __importDefault(require("../db/client"));
const crypto_1 = __importDefault(require("crypto"));
const mistral = config_1.config.MISTRAL_API_KEY
    ? new mistralai_1.Mistral({ apiKey: config_1.config.MISTRAL_API_KEY })
    : null;
const RubricResultSchema = zod_1.z.object({
    topicId: zod_1.z.string(),
    relevance: zod_1.z.number().min(0).max(100),
    novelty: zod_1.z.number().min(0).max(100),
    personaFit: zod_1.z.number().min(0).max(100),
    currentRelevance: zod_1.z.number().min(0).max(100),
    sourceQuality: zod_1.z.number().min(0).max(100),
    contentValue: zod_1.z.number().min(0).max(100),
    score: zod_1.z.number().min(0).max(100),
    decision: zod_1.z.enum(['ACCEPT', 'CONSIDER', 'REJECT']),
    reasoning: zod_1.z.string(),
});
const BatchEvaluationResponseSchema = zod_1.z.object({
    evaluations: zod_1.z.array(RubricResultSchema)
});
// In-memory cache to prevent duplicate LLM calls
const evaluationCache = new Map();
class EditorialService {
    getTopicHash(candidate) {
        return crypto_1.default.createHash('sha256').update(candidate.title + candidate.sourceUrl).digest('hex');
    }
    async evaluateCandidates(agentId, candidates, personaVoice, recentPosts) {
        const evaluated = [];
        const toEvaluateBatch = [];
        // 1. Check cache first
        for (const candidate of candidates) {
            const hash = this.getTopicHash(candidate);
            if (evaluationCache.has(hash)) {
                console.log(`[EVALUATION] Using cached result for: "${candidate.title}"`);
                evaluated.push({ candidate, evaluation: evaluationCache.get(hash) });
            }
            else {
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
            const savedCandidate = await client_1.default.topicCandidate.create({
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
    calculateWeightedScore(rubric) {
        return Math.round(rubric.relevance * 0.25 +
            rubric.novelty * 0.20 +
            rubric.personaFit * 0.20 +
            rubric.currentRelevance * 0.15 +
            rubric.sourceQuality * 0.10 +
            rubric.contentValue * 0.10);
    }
    determineStatus(score) {
        if (score >= config_1.config.MIN_ACCEPT_SCORE)
            return 'ACCEPTED';
        if (score >= config_1.config.MIN_CONSIDER_SCORE)
            return 'CONSIDER';
        return 'REJECTED';
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async evaluateBatchWithRetry(candidates, personaVoice, recentPosts, attempt = 1) {
        if (!mistral) {
            const map = new Map();
            candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, 'No Mistral API key configured.')));
            return map;
        }
        try {
            const recentContext = recentPosts.map((p) => p.text?.substring(0, 100) || '').join('; ');
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
            if (typeof messageContent !== 'string')
                throw new Error('No text response from Mistral');
            let jsonStr = messageContent.trim();
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch)
                jsonStr = jsonMatch[0];
            const parsed = JSON.parse(jsonStr);
            const batchResult = BatchEvaluationResponseSchema.parse(parsed);
            const resultMap = new Map();
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
        }
        catch (error) {
            const isRateLimit = error?.status === 429 || error?.message?.includes('429');
            console.error(`[LLM ERROR] Provider: Mistral | Status: ${error?.status || 'Unknown'} | Attempt: ${attempt}`);
            if (isRateLimit && attempt <= 3) {
                const backoffMs = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;
                console.log(`[LLM RATE LIMIT] Next retry in: ${backoffMs}ms`);
                await this.delay(backoffMs);
                return this.evaluateBatchWithRetry(candidates, personaVoice, recentPosts, attempt + 1);
            }
            console.error(`[LLM ERROR] Retry exhausted. Using deterministic fallback.`);
            const map = new Map();
            candidates.forEach(c => map.set(c.title, this.fallbackEvaluate(c, personaVoice, `LLM Error: ${error?.message || 'Unknown'}`)));
            return map;
        }
    }
    fallbackEvaluate(candidate, personaVoice, errorContext) {
        // STRICT Deterministic fallback based on heuristics
        let score = 0;
        const candidateText = (candidate.title + ' ' + (candidate.summary || '')).toLowerCase();
        // Domain keyword matching (up to 30 points, but requires multiple strong hits)
        const keywords = personaVoice.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const matchCount = keywords.filter(kw => candidateText.includes(kw)).length;
        score += Math.min(matchCount * 3, 30);
        // Source quality heuristic (up to 30 points)
        if (candidate.sourceUrl.includes('github.com'))
            score += 30;
        else if (candidate.sourceUrl.includes('arxiv.org'))
            score += 30;
        else if (candidate.sourceUrl.includes('ycombinator.com'))
            score += 15;
        // Specificity/Content heuristic (up to 20 points)
        if (candidateText.includes('release') || candidateText.includes('announce'))
            score += 10;
        if (candidateText.length > 150)
            score += 10;
        // Reject obvious low-quality questions
        if (candidateText.startsWith('ask hn:') || candidateText.includes('how to learn')) {
            score = Math.max(0, score - 50); // Severe penalty
        }
        const finalScore = Math.min(score, 100);
        const finalStatus = this.determineStatus(finalScore);
        return {
            score: finalScore,
            status: finalStatus,
            reasoning: `Rejected because the topic has weak relevance to the configured AI & technology persona. (Keywords matched: ${matchCount})`,
            evaluationData: {
                relevance: finalScore, novelty: 50, personaFit: 50, currentRelevance: 50, sourceQuality: 50, contentValue: 50
            },
            evaluationMethod: 'fallback'
        };
    }
}
exports.EditorialService = EditorialService;
exports.editorialService = new EditorialService();

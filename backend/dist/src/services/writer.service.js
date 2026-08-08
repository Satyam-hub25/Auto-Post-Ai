"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writerService = exports.WriterService = void 0;
const mistralai_1 = require("@mistralai/mistralai");
const config_1 = require("../config");
const zod_1 = require("zod");
const mistral = config_1.config.MISTRAL_API_KEY
    ? new mistralai_1.Mistral({ apiKey: config_1.config.MISTRAL_API_KEY })
    : null;
const WriterResultSchema = zod_1.z.object({
    text: zod_1.z.string(),
    rationale: zod_1.z.string(),
    sources: zod_1.z.array(zod_1.z.string()),
});
class WriterService {
    async writePost(topic, systemPrompt, memoryContext) {
        if (!mistral) {
            return this.mockWritePost(topic);
        }
        try {
            const recentContext = memoryContext
                .slice(0, 5)
                .map((p) => `- ${p.text?.substring(0, 150) || 'Previous post'}`)
                .join('\n');
            const prompt = `Write a thoughtful, opinionated blog post/article (600-1200 words) about the following topic.

TOPIC:
Title: ${topic.title}
Summary: ${topic.summary || 'No summary available'}
Source URL: ${topic.sourceUrl}

CONTEXT — Recent posts to avoid repetition:
${recentContext || 'No previous posts yet.'}

INSTRUCTIONS:
1. Write in the persona's voice as defined in the system prompt
2. Be insightful, opinionated, and provide actionable takeaways
3. Reference the source material but add original analysis
4. Include a compelling opening and strong conclusion
5. Use markdown formatting (headers, bold, lists) for readability

Respond ONLY with a JSON object in this exact format:
{
  "text": "The full markdown content of the post...",
  "rationale": "2-3 sentences explaining: why this topic was selected, why it matters now, and what makes it relevant to the persona's audience",
  "sources": ["${topic.sourceUrl}", "any other relevant URLs"]
}`;
            const response = await mistral.chat.complete({
                model: 'mistral-large-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                responseFormat: { type: 'json_object' }
            });
            const messageContent = response.choices?.[0]?.message?.content;
            if (typeof messageContent !== 'string') {
                throw new Error('No text response from Mistral');
            }
            // Extract JSON from response
            let jsonStr = messageContent.trim();
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            const parsed = JSON.parse(jsonStr);
            return WriterResultSchema.parse(parsed);
        }
        catch (error) {
            console.error('[Writer] Error generating post, falling back to mock:', error);
            return this.mockWritePost(topic);
        }
    }
    mockWritePost(topic) {
        const text = `# ${topic.title}

The tech landscape continues to evolve at a breathtaking pace, and today's topic is no exception. **${topic.title}** represents a significant development that deserves our attention and analysis.

## Why This Matters

In the rapidly shifting world of technology, staying ahead means understanding not just what's happening, but *why* it matters. This topic sits at the intersection of innovation and practical application — exactly where the most impactful developments tend to emerge.

${topic.summary ? `## The Details\n\n${topic.summary}\n` : ''}
## My Take

What makes this particularly interesting is the timing. We're seeing a convergence of factors that make this development especially relevant:

1. **Market readiness** — The ecosystem has matured enough to support this kind of innovation
2. **Technical feasibility** — Recent advances in adjacent fields have made this possible
3. **Demand signals** — The community has been asking for solutions in this space

## Looking Forward

This is just the beginning. As we continue to see developments in this area, I expect we'll see:

- More sophisticated approaches to the core problem
- Broader adoption across different sectors
- New opportunities for developers and researchers

The key takeaway? **Pay attention to this space.** The developments happening here will likely influence the broader technology landscape in ways we're only beginning to understand.

---

*This analysis is based on current trends and publicly available information. Sources linked below.*`;
        return {
            text,
            rationale: `Selected "${topic.title}" because it represents a timely development in the field. The topic is relevant to current industry trends and offers insights that align with the persona's expertise and audience interests.`,
            sources: [topic.sourceUrl],
        };
    }
}
exports.WriterService = WriterService;
exports.writerService = new WriterService();

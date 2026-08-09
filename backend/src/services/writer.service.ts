import Groq from 'groq-sdk';
import { config } from '../config';
import { z } from 'zod';

const groq = config.GROQ_API_KEY
  ? new Groq({ apiKey: config.GROQ_API_KEY })
  : null;

const WriterResultSchema = z.object({
  text: z.string(),
  rationale: z.string(),
  sources: z.array(z.string()),
});

type WriterResult = z.infer<typeof WriterResultSchema>;

interface TopicInput {
  title: string;
  summary?: string;
  content?: string;
  sourceUrl: string;
}

export class WriterService {
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async writePost(topic: TopicInput, systemPrompt: string, memoryContext: any[], attempt = 1): Promise<WriterResult> {
    if (!groq) {
      return this.mockWritePost(topic);
    }

    try {
      const recentContext = memoryContext
        .slice(0, 5)
        .map((p: any) => `- ${p.text?.substring(0, 150) || 'Previous post'}`)
        .join('\n');

      const prompt = `Write an original, research-style technology post (600-1200 words) about the following topic.

TOPIC:
Title: ${topic.title}
Content/Summary: ${topic.content ? topic.content.substring(0, 3000) : (topic.summary || 'No summary available')}
Source URL: ${topic.sourceUrl}

CONTEXT — Recent posts to avoid repetition:
${recentContext || 'No previous posts yet.'}

INSTRUCTIONS:
1. Write in the persona's voice as defined in the system prompt.
2. Create an original research-style technology post. Do NOT simply copy or summarize the source.
3. Structure the post to:
   - Explain what happened / what the topic is about.
   - Provide technical context.
   - Explain why it matters.
   - Add a unique angle or original analysis.
   - Provide implications for the industry or developers.
   - Discuss limitations when relevant.
4. Clearly separate facts from analysis.
5. Use markdown formatting (headers, bold, lists) for readability.
6. Reference the exact source URL provided.

OUTPUT FORMAT:
Write the full post in markdown. At the very end of your response, add a line "---RATIONALE---" followed by a 2-3 sentence editorial rationale explaining why this topic was selected.

Do NOT wrap in JSON. Just write the post directly in markdown.`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string' || messageContent.trim().length === 0) {
        throw new Error('No text response from Groq');
      }

      // Split response into post content and rationale
      const parts = messageContent.split('---RATIONALE---');
      const postText = parts[0].trim();
      const rationale = parts[1]?.trim() || `Selected "${topic.title}" because it represents a timely and relevant development in the field.`;

      return {
        text: postText,
        rationale,
        sources: [topic.sourceUrl],
      };
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      console.error(`[Writer] Error generating post | Status: ${error?.status || 'Unknown'} | Attempt: ${attempt}`);
      
      if (isRateLimit && attempt <= 3) {
        const backoffMs = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;
        console.log(`[Writer] LLM RATE LIMIT. Next retry in: ${backoffMs}ms`);
        await this.delay(backoffMs);
        return this.writePost(topic, systemPrompt, memoryContext, attempt + 1);
      }

      console.error('[Writer] Retry exhausted or fatal error, falling back to mock:', error?.message || error);
      return this.mockWritePost(topic);
    }
  }

  private mockWritePost(topic: TopicInput): WriterResult {
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

export const writerService = new WriterService();

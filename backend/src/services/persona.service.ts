import Groq from 'groq-sdk';
import { config } from '../config';
import prisma from '../db/client';

const groq = config.GROQ_API_KEY
  ? new Groq({ apiKey: config.GROQ_API_KEY })
  : null;

export class PersonaService {
  async generateVoiceGuide(name: string, domain: string): Promise<string> {
    if (!groq) {
      return this.mockVoiceGuide(name, domain);
    }

    try {
      const prompt = `Create a detailed voice guide and system prompt for an autonomous AI content creator persona.

Name: ${name}
Domain/Expertise: ${domain}

The voice guide MUST define:
1. **Tone**: How the persona communicates (e.g., authoritative but approachable, technical but accessible)
2. **Expertise Level**: What they know deeply, what they reference casually
3. **Opinion Style**: Are they contrarian? Balanced? Forward-looking?
4. **Writing Style**: Sentence structure, vocabulary level, use of analogies
5. **Recurring Themes**: What topics/angles they always gravitate toward
6. **Signature Phrases**: 2-3 phrases or patterns they use regularly
7. **What They Avoid**: Topics, styles, or approaches they never use

Return ONLY the voice guide text, formatted as a system prompt that can be directly used to instruct an AI to write in this persona's voice. Start with "You are ${name}..."`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') {
        throw new Error('No text response from Groq');
      }

      return messageContent.trim();
    } catch (error) {
      console.error('[Persona] Error generating voice guide, using mock:', error);
      return this.mockVoiceGuide(name, domain);
    }
  }

  async getSystemPrompt(agentId: string): Promise<string | null> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    return agent?.voiceGuide || null;
  }

  private mockVoiceGuide(name: string, domain: string): string {
    return `You are ${name}, an expert in ${domain} with deep industry knowledge and a passion for making complex topics accessible.

TONE: Authoritative yet approachable. You speak with confidence but remain curious and open to new ideas. You avoid jargon unless necessary, and when you use it, you explain it.

EXPERTISE: You have 15+ years of experience in ${domain}. You understand both the theoretical foundations and practical applications. You keep up with the latest research and industry trends.

OPINION STYLE: You are forward-looking and moderately contrarian. You challenge conventional wisdom when evidence supports it, but you acknowledge uncertainty. You believe in evidence-based analysis over hype.

WRITING STYLE: Clear, concise sentences with occasional longer, flowing passages for emphasis. You use analogies from everyday life to explain complex concepts. You favor active voice and concrete examples over abstract theorizing.

RECURRING THEMES: Innovation vs. practical application, the human impact of technology, long-term thinking vs. short-term gains, the importance of fundamentals in ${domain}.

SIGNATURE PHRASES: "Here's what most people miss...", "The real question isn't X, it's Y...", "Let me break this down..."

WHAT YOU AVOID: Clickbait, unfounded speculation, overly promotional language, dismissing opposing viewpoints without engagement.`;
  }
}

export const personaService = new PersonaService();

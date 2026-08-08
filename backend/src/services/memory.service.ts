import prisma from '../db/client';

export class MemoryService {
  extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const keywords = new Set<string>();
    
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        keywords.add(word);
      }
    }
    
    return Array.from(keywords).slice(0, 20); // Top 20 keywords
  }

  async addToMemory(postId: string, text: string): Promise<void> {
    const keywords = this.extractKeywords(text);
    await prisma.post.update({
      where: { id: postId },
      data: { keywords: JSON.stringify(keywords) },
    });
  }

  async getRecentContext(agentId: string, limit: number = 10): Promise<any[]> {
    return prisma.post.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, text: true, keywords: true },
    });
  }

  async isTooSimilar(topicTitle: string, topicSummary: string = '', agentId: string, threshold: number = 0.6): Promise<boolean> {
    const recentPosts = await this.getRecentContext(agentId, 20);
    const newKeywords = new Set(this.extractKeywords(`${topicTitle} ${topicSummary}`));
    
    if (newKeywords.size === 0) return false;

    for (const post of recentPosts) {
      if (!post.keywords || post.keywords === '[]') continue;
      
      const existingKeywords = new Set(JSON.parse(post.keywords as string));
      let overlap = 0;
      
      for (const keyword of newKeywords) {
        if (existingKeywords.has(keyword)) overlap++;
      }
      
      const similarity = overlap / newKeywords.size;
      if (similarity >= threshold) {
        return true;
      }
    }
    
    return false;
  }
}

export const memoryService = new MemoryService();

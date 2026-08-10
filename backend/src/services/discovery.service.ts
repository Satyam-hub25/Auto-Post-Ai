import * as cheerio from 'cheerio';

export interface TopicCandidate {
  title: string;
  summary?: string;
  content?: string;
  sourceUrl: string;
}

export interface DiscoverySource {
  discover(domain: string): Promise<TopicCandidate[]>;
}

export class HackerNewsDiscovery implements DiscoverySource {
  private async fetchContent(url: string): Promise<string | undefined> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(timeoutId);
      
      if (!res.ok) return undefined;
      const html = await res.text();
      const $ = cheerio.load(html);
      
      // Remove noise
      $('script, style, nav, footer, header, iframe, noscript').remove();
      
      // Extract main text
      let text = $('article, main, .content, .post').text();
      if (!text || text.trim().length < 100) {
        text = $('body').text();
      }
      
      // Clean up whitespace
      return text.replace(/\s+/g, ' ').trim().substring(0, 5000); // Limit to 5000 chars to avoid massive LLM context
    } catch (e) {
      return undefined;
    }
  }

  async discover(domain: string): Promise<TopicCandidate[]> {
    try {
      // Create a domain-specific query to find relevant topics
      const domainTerms = domain.split(/[\s,]+/).filter(t => t.length > 2).join(' OR ');
      const query = encodeURIComponent(`(${domainTerms}) OR technology OR AI`);
      const url = `http://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=40`;
      const response = await fetch(url);
      const data = await response.json();
      
      const candidates: TopicCandidate[] = [];
      for (const hit of data.hits) {
        const sourceUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        
        candidates.push({
          title: hit.title,
          summary: hit.story_text || undefined,
          sourceUrl,
        });
      }
      
      // Fetch content for top 15 to keep it fast
      for (let i = 0; i < Math.min(candidates.length, 15); i++) {
         if (candidates[i].sourceUrl) {
           candidates[i].content = await this.fetchContent(candidates[i].sourceUrl);
         }
      }
        
      return candidates;
    } catch (error) {
      console.error('Error fetching from HackerNews:', error);
      return [];
    }
  }
}

export class DiscoveryService {
  private sources: DiscoverySource[] = [new HackerNewsDiscovery()];

  async discoverTopics(domain: string): Promise<TopicCandidate[]> {
    const allCandidates: TopicCandidate[] = [];
    for (const source of this.sources) {
      const candidates = await source.discover(domain);
      allCandidates.push(...candidates);
    }

    // Deduplicate by URL and Title
    const unique = new Map<string, TopicCandidate>();
    for (const c of allCandidates) {
      const key = (c.title + c.sourceUrl).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!unique.has(key)) {
        unique.set(key, c);
      }
    }

    return Array.from(unique.values());
  }
}

export const discoveryService = new DiscoveryService();

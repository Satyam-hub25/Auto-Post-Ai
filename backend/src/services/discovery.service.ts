export interface TopicCandidate {
  title: string;
  summary?: string;
  sourceUrl: string;
}

export interface DiscoverySource {
  discover(domain: string): Promise<TopicCandidate[]>;
}

export class HackerNewsDiscovery implements DiscoverySource {
  async discover(domain: string): Promise<TopicCandidate[]> {
    try {
      // Expand query for specific niche domains to ensure enough hits
      let queryStr = domain.toLowerCase();
      if (queryStr.includes('cybersecurity') || queryStr.includes('security')) {
        queryStr = '(cybersecurity OR security OR vulnerability OR hack OR breach OR infosec)';
      } else if (queryStr.includes('data science') || queryStr.includes('analytics')) {
        queryStr = '(data science OR machine learning OR analytics OR big data)';
      }
      
      // Randomize the page (0-5) so the agent doesn't fetch the exact same top 40 results every cycle
      const randomPage = Math.floor(Math.random() * 6);
      const url = `http://hn.algolia.com/api/v1/search?query=${encodeURIComponent(queryStr)}&tags=story&hitsPerPage=40&page=${randomPage}`;
      const response = await fetch(url);
      const data = await response.json();
      
      const candidates: TopicCandidate[] = data.hits
        .map((hit: any) => ({
          title: hit.title,
          summary: hit.story_text || undefined,
          sourceUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        }));
        
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

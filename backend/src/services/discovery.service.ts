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
      const url = `http://hn.algolia.com/api/v1/search?query=${encodeURIComponent(domain)}&tags=story&hitsPerPage=10`;
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
    return allCandidates;
  }
}

export const discoveryService = new DiscoveryService();

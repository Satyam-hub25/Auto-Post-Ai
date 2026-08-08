"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryService = exports.DiscoveryService = exports.HackerNewsDiscovery = void 0;
class HackerNewsDiscovery {
    async discover(domain) {
        try {
            const url = `http://hn.algolia.com/api/v1/search?query=${encodeURIComponent(domain)}&tags=story&hitsPerPage=10`;
            const response = await fetch(url);
            const data = await response.json();
            const candidates = data.hits
                .map((hit) => ({
                title: hit.title,
                summary: hit.story_text || undefined,
                sourceUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            }));
            return candidates;
        }
        catch (error) {
            console.error('Error fetching from HackerNews:', error);
            return [];
        }
    }
}
exports.HackerNewsDiscovery = HackerNewsDiscovery;
class DiscoveryService {
    sources = [new HackerNewsDiscovery()];
    async discoverTopics(domain) {
        const allCandidates = [];
        for (const source of this.sources) {
            const candidates = await source.discover(domain);
            allCandidates.push(...candidates);
        }
        return allCandidates;
    }
}
exports.DiscoveryService = DiscoveryService;
exports.discoveryService = new DiscoveryService();

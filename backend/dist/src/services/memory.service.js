"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryService = exports.MemoryService = void 0;
const client_1 = __importDefault(require("../db/client"));
class MemoryService {
    extractKeywords(text) {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        const keywords = new Set();
        for (const word of words) {
            if (word.length > 3 && !stopWords.has(word)) {
                keywords.add(word);
            }
        }
        return Array.from(keywords).slice(0, 20); // Top 20 keywords
    }
    async addToMemory(postId, text) {
        const keywords = this.extractKeywords(text);
        await client_1.default.post.update({
            where: { id: postId },
            data: { keywords: JSON.stringify(keywords) },
        });
    }
    async getRecentContext(agentId, limit = 10) {
        return client_1.default.post.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { id: true, text: true, keywords: true },
        });
    }
    async isTooSimilar(topicTitle, topicSummary = '', agentId, threshold = 0.6) {
        const recentPosts = await this.getRecentContext(agentId, 20);
        const newKeywords = new Set(this.extractKeywords(`${topicTitle} ${topicSummary}`));
        if (newKeywords.size === 0)
            return false;
        for (const post of recentPosts) {
            if (!post.keywords || post.keywords === '[]')
                continue;
            const existingKeywords = new Set(JSON.parse(post.keywords));
            let overlap = 0;
            for (const keyword of newKeywords) {
                if (existingKeywords.has(keyword))
                    overlap++;
            }
            const similarity = overlap / newKeywords.size;
            if (similarity >= threshold) {
                return true;
            }
        }
        return false;
    }
}
exports.MemoryService = MemoryService;
exports.memoryService = new MemoryService();

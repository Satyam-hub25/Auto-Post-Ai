import cron from 'node-cron';
import { discoveryService } from './discovery.service';
import { editorialService } from './editorial.service';
import { personaService } from './persona.service';
import { writerService } from './writer.service';
import { memoryService } from './memory.service';
import prisma from '../db/client';
import { config } from '../config';

export class SchedulerService {
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();

  async startAgentSchedule(agentId: string): Promise<void> {
    // Stop existing job if any
    if (this.activeJobs.has(agentId)) {
      this.stopAgentSchedule(agentId);
    }

    // Randomized interval between CRON_INTERVAL_MIN and CRON_INTERVAL_MAX
    const interval = Math.floor(
      Math.random() * (config.CRON_INTERVAL_MAX - config.CRON_INTERVAL_MIN + 1) + config.CRON_INTERVAL_MIN
    );

    // node-cron expression for every N minutes
    const cronExpression = `*/${interval} * * * *`;

    console.log(`[Scheduler] Agent ${agentId}: Registering cron every ${interval} minutes (${cronExpression})`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Agent ${agentId}: Cron triggered at ${new Date().toISOString()}`);
      await this.runCycleNow(agentId);
    });

    this.activeJobs.set(agentId, job);

    // Kick off one immediate cycle (async, non-blocking) so the feed isn't empty
    console.log(`[Scheduler] Agent ${agentId}: Kicking off immediate first cycle`);
    setTimeout(() => {
      this.runCycleNow(agentId).catch(err => {
        console.error(`[Scheduler] Agent ${agentId}: First cycle error:`, err);
      });
    }, 2000);
  }

  stopAgentSchedule(agentId: string): void {
    const job = this.activeJobs.get(agentId);
    if (job) {
      job.stop();
      this.activeJobs.delete(agentId);
      console.log(`[Scheduler] Agent ${agentId}: Cron job stopped`);
    }
  }

  async runCycleNow(agentId: string): Promise<void> {
    const startTime = Date.now();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  AUTONOMOUS CYCLE — Agent ${agentId}`);
    console.log(`  Started: ${new Date().toISOString()}`);
    console.log(`${'═'.repeat(60)}`);

    try {
      // Verify agent exists
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent) {
        console.error(`[Cycle] Agent not found: ${agentId}`);
        return;
      }

      // ── Step 1: DISCOVER ──
      console.log(`\n[Cycle] Step 1/5: DISCOVERING topics for domain "${agent.domain}"...`);
      const candidates = await discoveryService.discoverTopics(agent.domain);
      console.log(`[Cycle]   → Found ${candidates.length} raw candidates`);

      if (candidates.length === 0) {
        console.log(`[Cycle]   → No candidates found. Cycle complete (empty).`);
        return;
      }

      // ── Step 2: STAGE 1 (LOCAL PRE-FILTERING) ──
      console.log(`\n[Cycle] Step 2/5: LOCAL PRE-FILTERING (Removing obvious noise)...`);
      const filteredCandidates = candidates.filter(c => {
        const text = (c.title + ' ' + (c.summary || '')).toLowerCase();
        
        // Fast hard rejections for promotional/generic content
        const blockedKeywords = ['discount', 'ticket', 'sponsor', 'event', 'playlist', 'tutorial', 'marketing', 'promo'];
        if (blockedKeywords.some(kw => text.includes(kw))) return false;
        
        if (text.length < 10) return false; // Basic sanity check
        return true;
      });
      console.log(`[Cycle]   → Stage 1 complete. ${filteredCandidates.length}/${candidates.length} passed local filter.`);

      if (filteredCandidates.length === 0) {
        console.log(`[Cycle]   → No candidates passed local filtering. Cycle complete.`);
        return;
      }

      // ── Step 3: STAGE 2 (LLM BATCH EVALUATION & MEMORY CHECK) ──
      console.log(`\n[Cycle] Step 3/5: BATCH EDITORIAL JUDGMENT (evaluating ${filteredCandidates.length} candidates)...`);
      const systemPrompt = agent.voiceGuide || '';
      const recentPosts = await memoryService.getRecentContext(agentId, 10);
      
      const evaluated = await editorialService.evaluateCandidates(
        agentId,
        filteredCandidates, // Evaluate ALL filtered candidates
        systemPrompt,
        recentPosts
      );

      // ONLY ACCEPT if score >= 70
      let accepted = evaluated.filter(e => e.status === 'ACCEPTED').sort((a, b) => b.score - a.score);
      const rejected = evaluated.filter(e => e.status === 'REJECTED');
      console.log(`[Cycle]   → Accepted: ${accepted.length}, Rejected/Considered: ${evaluated.length - accepted.length}`);

      if (accepted.length === 0) {
        console.log(`[Cycle]   → No suitable topic found. Waiting for next cycle.`);
        return;
      }

      // ── Step 3b: MEMORY CHECK ──
      console.log(`\n[Cycle] Step 3b/5: MEMORY CHECK (filtering duplicates)...`);
      const strictlyAccepted = [];
      for (const topic of accepted) {
         const isDupe = await memoryService.isTooSimilar(topic.title, topic.summary || '', agentId);
         if (isDupe) {
           console.log(`[Cycle]   → Skipping "${topic.title}" (too similar to recent posts)`);
           // Optionally update DB to REJECTED due to memory
           await prisma.topicCandidate.update({
             where: { id: topic.id },
             data: { status: 'REJECTED', reason: 'Rejected due to high similarity with recently published content.' }
           });
         } else {
           strictlyAccepted.push(topic);
         }
      }

      if (strictlyAccepted.length === 0) {
        console.log(`[Cycle]   → All accepted topics were duplicates. Waiting for next cycle.`);
        return;
      }

      const topTopic = strictlyAccepted[0];
      console.log(`[Cycle]   → Top topic selected: "${topTopic.title}" (score: ${topTopic.score}, status: ${topTopic.status})`);

      // ── Step 4: WRITE POST ──
      console.log(`\n[Cycle] Step 4/5: WRITING post in persona voice...`);
      const postContent = await writerService.writePost(
        { title: topTopic.title, summary: topTopic.summary, content: topTopic._content, sourceUrl: topTopic.sourceUrl },
        systemPrompt,
        recentPosts
      );
      console.log(`[Cycle]   → Generated ${postContent.text.length} chars, ${postContent.sources.length} sources`);

      // ── Step 5: PUBLISH ──
      console.log(`\n[Cycle] Step 5/5: PUBLISHING post...`);
      const post = await prisma.post.create({
        data: {
          agentId,
          text: postContent.text,
          rationale: postContent.rationale,
          sources: JSON.stringify(postContent.sources),
          keywords: JSON.stringify([]),
          candidatesCount: candidates.length,
          topicId: topTopic.id, // Linking back to the TopicCandidate for scores
        }
      });

      // Update memory with keywords
      await memoryService.addToMemory(post.id, `${topTopic.title} ${post.text}`);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n[Cycle] ✅ CYCLE COMPLETE in ${elapsed}s`);
      console.log(`[Cycle]   Post ID: ${post.id}`);
      console.log(`[Cycle]   Topic: "${topTopic.title}"`);
      console.log(`${'═'.repeat(60)}\n`);

    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`\n[Cycle] ❌ CYCLE FAILED after ${elapsed}s:`, error);
      console.log(`${'═'.repeat(60)}\n`);
    }
  }
}

export const schedulerService = new SchedulerService();

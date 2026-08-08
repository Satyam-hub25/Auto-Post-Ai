import { PrismaClient } from '@prisma/client';
import { schedulerService } from './src/services/scheduler.service';

const prisma = new PrismaClient();

async function testCycle() {
  const agent = await prisma.agent.findFirst();
  if (!agent) {
    console.log("No agent found in database.");
    process.exit(1);
  }

  console.log(`Starting test cycle for agent: ${agent.personaName} (${agent.domain})`);
  
  // Run one cycle
  await schedulerService.runCycleNow(agent.id);
  
  console.log("Test cycle completed.");
  process.exit(0);
}

testCycle();

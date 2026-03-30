import { db } from './client.js';
import { owners, agents, apiKeys, memories, memorySessions, entities, relations, learnings, agentSkills } from './schema.js';
import { createHash, randomBytes } from 'node:crypto';

async function seed() {
  console.log('Seeding SwarmRecall database...');

  // Create demo owner
  const [owner] = await db.insert(owners).values({
    firebaseUid: 'demo-uid-001',
    email: 'demo@swarmrecall.ai',
    displayName: 'Demo User',
    plan: 'free',
  }).returning();

  console.log(`Created owner: ${owner.id}`);

  // Create demo agents
  const [agent1] = await db.insert(agents).values({
    ownerId: owner.id,
    name: 'claude-work',
    description: 'Claude Code agent for work projects',
  }).returning();

  const [agent2] = await db.insert(agents).values({
    ownerId: owner.id,
    name: 'claude-personal',
    description: 'Claude Code agent for personal projects',
  }).returning();

  console.log(`Created agents: ${agent1.id}, ${agent2.id}`);

  // Create API key for agent1
  const rawKey = 'sr_live_' + randomBytes(20).toString('hex');
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  await db.insert(apiKeys).values({
    ownerId: owner.id,
    agentId: agent1.id,
    name: 'Development Key',
    keyPrefix: rawKey.slice(0, 16),
    keyHash,
    scopes: ['memory.read', 'memory.write', 'knowledge.read', 'knowledge.write', 'learnings.read', 'learnings.write', 'skills.read', 'skills.write'],
  });

  console.log(`API Key (save this!): ${rawKey}`);

  // Create session
  const [session] = await db.insert(memorySessions).values({
    agentId: agent1.id,
    ownerId: owner.id,
    context: { task: 'Build SwarmRecall dashboard' },
    currentState: { progress: 'in-progress' },
  }).returning();

  // Seed memories
  const memoryData = [
    { content: 'User prefers Tailwind CSS over styled-components', category: 'preference', importance: 0.9 },
    { content: 'Project uses Turborepo monorepo with pnpm workspaces', category: 'fact', importance: 0.8 },
    { content: 'Decided to use Firebase Auth for dashboard and API keys for agents', category: 'decision', importance: 1.0 },
    { content: 'User is building an AI agent ecosystem: SwarmDock, SwarmClaw, SwarmRecall', category: 'context', importance: 0.7 },
    { content: 'Always use pnpm, not npm, for this project', category: 'preference', importance: 0.95 },
  ];

  for (const m of memoryData) {
    await db.insert(memories).values({
      agentId: agent1.id,
      ownerId: owner.id,
      ...m,
      tags: [],
      sessionId: session.id,
    });
  }

  console.log(`Created ${memoryData.length} memories`);

  // Seed knowledge entities
  const [person] = await db.insert(entities).values({
    agentId: agent1.id,
    ownerId: owner.id,
    type: 'Person',
    name: 'Wayde',
    properties: { role: 'Developer', email: 'wayde@example.com' },
  }).returning();

  const [project] = await db.insert(entities).values({
    agentId: agent1.id,
    ownerId: owner.id,
    type: 'Project',
    name: 'SwarmRecall',
    properties: { domain: 'swarmrecall.ai', status: 'active' },
  }).returning();

  await db.insert(relations).values({
    agentId: agent1.id,
    ownerId: owner.id,
    fromEntityId: project.id,
    toEntityId: person.id,
    relation: 'has_owner',
  });

  console.log('Created knowledge entities and relations');

  // Seed learnings
  const learningData = [
    { category: 'correction', summary: 'Use pnpm not npm for this project', priority: 'high', area: 'config' },
    { category: 'error', summary: 'pgvector extension must be enabled before creating vector columns', priority: 'critical', area: 'infra' },
    { category: 'best_practice', summary: 'Always scope database queries by ownerId for tenant isolation', priority: 'high', area: 'backend' },
  ];

  for (const l of learningData) {
    await db.insert(learnings).values({
      agentId: agent1.id,
      ownerId: owner.id,
      ...l,
      status: 'pending',
      tags: [],
    });
  }

  console.log(`Created ${learningData.length} learnings`);

  // Seed skills
  await db.insert(agentSkills).values({
    agentId: agent1.id,
    ownerId: owner.id,
    name: 'self-improving-agent',
    version: '3.0.10',
    source: 'clawhub:pskoett/self-improving-agent',
    description: 'Captures learnings, errors, corrections. LEARNINGS.md + ERRORS.md',
    status: 'active',
    invocationCount: 42,
  });

  console.log('Created agent skills');
  console.log('Seed complete!');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

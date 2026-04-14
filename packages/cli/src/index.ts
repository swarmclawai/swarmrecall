#!/usr/bin/env node
import { Command } from 'commander';
import { SwarmRecallClient } from '@swarmrecall/sdk';
import {
  DEFAULT_API_BASE_URL,
  loadConfig,
  saveConfig,
} from '@swarmrecall/shared/config';

function getClient(): SwarmRecallClient {
  const config = loadConfig();
  const apiKey = process.env.SWARMRECALL_API_KEY ?? config.apiKey;
  const baseUrl = process.env.SWARMRECALL_API_URL ?? config.baseUrl;
  if (!apiKey) {
    console.error('No API key configured. Run: swarmrecall config set-key <key>');
    process.exit(1);
  }
  return new SwarmRecallClient({ apiKey, baseUrl });
}

function output(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

const program = new Command();

program
  .name('swarmrecall')
  .description('SwarmRecall CLI — manage agent memory, knowledge, learnings, and skills')
  .version('0.3.0');

// --- Register ---

program
  .command('register')
  .description('Register a new agent and get an API key (no account needed)')
  .option('-n, --name <name>', 'Agent display name')
  .option('--save', 'Save the API key to local config')
  .action(async (opts) => {
    const cfg = loadConfig();
    try {
      const result = await SwarmRecallClient.register({
        name: opts.name,
        baseUrl: process.env.SWARMRECALL_API_URL ?? cfg.baseUrl,
      });

      console.log('Registration successful!\n');
      console.log(`API Key:     ${result.apiKey}`);
      console.log(`Claim Token: ${result.claimToken}`);
      console.log(`\nTo manage your agent's data, visit: swarmrecall.ai/claim`);
      console.log(`Use code: ${result.claimToken}`);

      if (opts.save) {
        cfg.apiKey = result.apiKey;
        saveConfig(cfg);
        console.log('\nAPI key saved to config.');
      } else {
        console.log('\nTo save this key, run again with --save or run:');
        console.log(`  swarmrecall config set-key ${result.apiKey}`);
      }
    } catch (err) {
      console.error(`Registration failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- Config ---

const config = program.command('config');

config
  .command('set-key <key>')
  .description('Set API key')
  .action((key: string) => {
    const cfg = loadConfig();
    cfg.apiKey = key;
    saveConfig(cfg);
    console.log('API key saved');
  });

config
  .command('set-url <url>')
  .description('Set API base URL')
  .action((url: string) => {
    const cfg = loadConfig();
    cfg.baseUrl = url;
    saveConfig(cfg);
    console.log(`Base URL set to ${url}`);
  });

config
  .command('show')
  .description('Show current config')
  .action(() => {
    const cfg = loadConfig();
    console.log(`API Key: ${cfg.apiKey ? cfg.apiKey.slice(0, 16) + '...' : '(not set)'}`);
    console.log(`Base URL: ${cfg.baseUrl ?? DEFAULT_API_BASE_URL}`);
  });

// --- Memory ---

const memory = program.command('memory');

memory
  .command('store <content>')
  .description('Store a memory')
  .option('-c, --category <cat>', 'Category', 'fact')
  .option('-i, --importance <n>', 'Importance (0-1)', '0.5')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-p, --pool <poolId>', 'Pool to write to')
  .action(async (content: string, opts) => {
    const client = getClient();
    const result = await client.memory.store({
      content,
      category: opts.category,
      importance: parseFloat(opts.importance),
      tags: opts.tags?.split(',') ?? [],
      poolId: opts.pool,
    });
    output(result);
  });

memory
  .command('search <query>')
  .description('Search memories')
  .option('-l, --limit <n>', 'Limit', '10')
  .action(async (query: string, opts) => {
    const client = getClient();
    const result = await client.memory.search(query, { limit: parseInt(opts.limit) });
    output(result);
  });

memory
  .command('list')
  .description('List memories')
  .option('-c, --category <cat>', 'Filter by category')
  .option('-l, --limit <n>', 'Limit', '20')
  .action(async (opts) => {
    const client = getClient();
    const result = await client.memory.list({
      category: opts.category,
      limit: parseInt(opts.limit),
    });
    output(result);
  });

const sessions = memory.command('sessions');

sessions
  .command('list')
  .description('List sessions')
  .action(async () => {
    const client = getClient();
    const result = await client.memory.sessions.list();
    output(result);
  });

sessions
  .command('current')
  .description('Get current session')
  .action(async () => {
    const client = getClient();
    const result = await client.memory.sessions.current();
    output(result);
  });

// --- Knowledge ---

const knowledge = program.command('knowledge');

knowledge
  .command('create')
  .description('Create entity')
  .requiredOption('--type <type>', 'Entity type')
  .requiredOption('--name <name>', 'Entity name')
  .option('--props <json>', 'Properties as JSON', '{}')
  .option('-p, --pool <poolId>', 'Pool to write to')
  .action(async (opts) => {
    const client = getClient();
    const result = await client.knowledge.entities.create({
      type: opts.type,
      name: opts.name,
      properties: JSON.parse(opts.props),
      poolId: opts.pool,
    });
    output(result);
  });

knowledge
  .command('search <query>')
  .description('Search entities')
  .action(async (query: string) => {
    const client = getClient();
    const result = await client.knowledge.search(query);
    output(result);
  });

knowledge
  .command('traverse')
  .description('Traverse graph')
  .requiredOption('--from <id>', 'Start entity ID')
  .option('--rel <relation>', 'Relation type')
  .option('--depth <n>', 'Depth', '1')
  .action(async (opts) => {
    const client = getClient();
    const result = await client.knowledge.traverse({
      startId: opts.from,
      relation: opts.rel,
      depth: parseInt(opts.depth),
    });
    output(result);
  });

// --- Learnings ---

const learnings = program.command('learnings');

learnings
  .command('log')
  .description('Log a learning')
  .requiredOption('--category <cat>', 'Category')
  .requiredOption('--summary <text>', 'Summary')
  .option('--details <text>', 'Details')
  .option('--priority <p>', 'Priority', 'medium')
  .option('--area <area>', 'Area')
  .option('-p, --pool <poolId>', 'Pool to write to')
  .action(async (opts) => {
    const client = getClient();
    const result = await client.learnings.log({
      category: opts.category,
      summary: opts.summary,
      details: opts.details,
      priority: opts.priority,
      area: opts.area,
      poolId: opts.pool,
    });
    output(result);
  });

learnings
  .command('patterns')
  .description('List recurring patterns')
  .action(async () => {
    const client = getClient();
    const result = await client.learnings.patterns();
    output(result);
  });

learnings
  .command('promotions')
  .description('List promotion candidates')
  .action(async () => {
    const client = getClient();
    const result = await client.learnings.promotions();
    output(result);
  });

// --- Skills ---

const skills = program.command('skills');

skills
  .command('list')
  .description('List installed skills')
  .option('--status <status>', 'Filter by status')
  .action(async (opts) => {
    const client = getClient();
    const result = await client.skills.list({ status: opts.status });
    output(result);
  });

skills
  .command('register')
  .description('Register a skill')
  .requiredOption('--name <name>', 'Skill name')
  .option('--source <source>', 'Source (clawhub slug or git URL)')
  .option('--version <version>', 'Version')
  .option('-p, --pool <poolId>', 'Pool to write to')
  .action(async (opts) => {
    const client = getClient();
    const result = await client.skills.register({
      name: opts.name,
      source: opts.source,
      version: opts.version,
      poolId: opts.pool,
    });
    output(result);
  });

// --- Pools ---

const pools = program.command('pools');

pools
  .command('list')
  .description('List pools this agent belongs to')
  .action(async () => {
    const client = getClient();
    const result = await client.pools.list();
    output(result);
  });

pools
  .command('show <poolId>')
  .description('Show pool details and access levels')
  .action(async (poolId: string) => {
    const client = getClient();
    const result = await client.pools.get(poolId);
    output(result);
  });

// --- Dream ---

const dream = program.command('dream');

dream
  .command('start')
  .description('Start a dream cycle')
  .option('--ops <ops>', 'Comma-separated operations to run')
  .option('--dry-run', 'Preview without making changes')
  .action(async (opts: { ops?: string; dryRun?: boolean }) => {
    const client = getClient();
    const params: { operations?: string[]; dryRun?: boolean } = {};
    if (opts.ops) params.operations = opts.ops.split(',').map((s) => s.trim());
    if (opts.dryRun) params.dryRun = true;
    const result = await client.dream.start(params);
    output(result);
  });

dream
  .command('status')
  .description('Show last dream cycle results')
  .action(async () => {
    const client = getClient();
    const result = await client.dream.list({ limit: 1 });
    if (result.data.length === 0) {
      console.log('No dream cycles found.');
    } else {
      output(result.data[0]);
    }
  });

dream
  .command('config')
  .description('Show or update dream configuration')
  .option('--enable', 'Enable auto-dreaming')
  .option('--disable', 'Disable auto-dreaming')
  .option('--interval <hours>', 'Set interval in hours')
  .action(async (opts: { enable?: boolean; disable?: boolean; interval?: string }) => {
    const client = getClient();
    if (opts.enable || opts.disable || opts.interval) {
      const params: { enabled?: boolean; intervalHours?: number } = {};
      if (opts.enable) params.enabled = true;
      if (opts.disable) params.enabled = false;
      if (opts.interval) params.intervalHours = Number(opts.interval);
      const result = await client.dream.updateConfig(params);
      output(result);
    } else {
      const result = await client.dream.getConfig();
      output(result);
    }
  });

dream
  .command('candidates <type>')
  .description('List dream candidates (duplicates, stale, contradictions, unsummarized-sessions, duplicate-entities, unprocessed)')
  .option('-l, --limit <n>', 'Limit results', '20')
  .action(async (type: string, opts: { limit: string }) => {
    const client = getClient();
    const limit = Number(opts.limit);
    switch (type) {
      case 'duplicates': output(await client.dream.getDuplicates({ limit })); break;
      case 'stale': output(await client.dream.getStale({ limit })); break;
      case 'contradictions': output(await client.dream.getContradictions({ limit })); break;
      case 'unsummarized-sessions': output(await client.dream.getUnsummarizedSessions({ limit })); break;
      case 'duplicate-entities': output(await client.dream.getDuplicateEntities({ limit })); break;
      case 'unprocessed': output(await client.dream.getUnprocessed({ limit })); break;
      default: console.error(`Unknown candidate type: ${type}. Use: duplicates, stale, contradictions, unsummarized-sessions, duplicate-entities, unprocessed`);
    }
  });

dream
  .command('execute')
  .description('Run Tier 1 server-side operations (decay, prune, orphan cleanup)')
  .option('--ops <ops>', 'Comma-separated operations')
  .action(async (opts: { ops?: string }) => {
    const client = getClient();
    const params: { operations?: string[] } = {};
    if (opts.ops) params.operations = opts.ops.split(',').map((s) => s.trim());
    const result = await client.dream.execute(params);
    output(result);
  });

// --- MCP ---

program
  .command('mcp')
  .description('Run SwarmRecall as an MCP server over stdio for Claude Desktop/Code, Cursor, and other MCP clients')
  .action(async () => {
    try {
      const { startMcpServer } = await import('@swarmrecall/mcp');
      const server = await startMcpServer();
      const shutdown = () => {
        server.close().finally(() => process.exit(0));
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (err) {
      if ((err as { name?: string }).name === 'MissingApiKeyError') {
        console.error((err as Error).message);
        console.error('Run: swarmrecall register --save');
        process.exit(1);
      }
      console.error(`Failed to start MCP server: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse();

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server — SwarmRecall',
  description:
    'Connect Claude Desktop, Claude Code, Cursor, and any MCP-compatible agent to SwarmRecall over stdio. 52 tools and 4 resources covering memory, knowledge, learnings, skills, pools, and dream cycles.',
};

const memoryTools = [
  ['memory_store', 'Store a memory (fact, preference, decision, context, session summary).'],
  ['memory_search', 'Semantic search across memories.'],
  ['memory_get', 'Fetch a memory by ID.'],
  ['memory_list', 'List memories with optional filtering.'],
  ['memory_update', 'Update importance, tags, metadata, or archived flag.'],
  ['memory_delete', 'Permanently delete a memory.'],
  ['memory_sessions_start', 'Start a new memory session.'],
  ['memory_sessions_current', 'Get the currently active session.'],
  ['memory_sessions_update', 'Update session state, summary, or mark ended.'],
  ['memory_sessions_list', 'List sessions.'],
];

const knowledgeTools = [
  ['knowledge_entity_create', 'Create an entity (person, project, tool, concept).'],
  ['knowledge_entity_get', 'Fetch an entity with its outgoing relations.'],
  ['knowledge_entity_list', 'List entities with optional filtering.'],
  ['knowledge_entity_update', 'Update an entity.'],
  ['knowledge_entity_delete', 'Delete an entity and its relations.'],
  ['knowledge_relation_create', 'Create a directed relation between two entities.'],
  ['knowledge_relation_list', 'List relations.'],
  ['knowledge_relation_delete', 'Delete a relation.'],
  ['knowledge_traverse', 'Traverse the graph from a starting entity.'],
  ['knowledge_search', 'Semantic search across entities.'],
  ['knowledge_validate', 'Validate the graph against defined constraints.'],
];

const learningsTools = [
  ['learning_log', 'Log an error, correction, discovery, optimization, or preference.'],
  ['learning_search', 'Semantic search across learnings.'],
  ['learning_get', 'Fetch a learning by ID.'],
  ['learning_list', 'List learnings with filtering.'],
  ['learning_update', 'Update status, priority, resolution, area, or tags.'],
  ['learning_patterns', 'List recurring patterns detected across learnings.'],
  ['learning_promotions', 'List patterns ready to be promoted into rules.'],
  ['learning_resolve', 'Mark a learning as resolved.'],
  ['learning_link', 'Link related learnings for pattern detection.'],
];

const skillsTools = [
  ['skill_register', 'Register a skill the agent has acquired.'],
  ['skill_list', 'List registered skills.'],
  ['skill_get', 'Fetch a skill by ID.'],
  ['skill_update', "Update a skill's version, config, or status."],
  ['skill_remove', 'Unregister a skill.'],
  ['skill_suggest', 'Suggest skills relevant to a task context.'],
];

const poolsTools = [
  ['pool_list', 'List shared pools this agent belongs to.'],
  ['pool_get', 'Get details for a specific pool and its members.'],
];

const dreamTools = [
  ['dream_start', 'Start a dream cycle for memory consolidation.'],
  ['dream_get', 'Get details of a specific dream cycle.'],
  ['dream_list', 'List dream cycles.'],
  ['dream_update', 'Update a cycle status or attach results.'],
  ['dream_complete', 'Mark a cycle as completed.'],
  ['dream_fail', 'Mark a cycle as failed.'],
  ['dream_get_config', 'Get the current dream configuration.'],
  ['dream_update_config', 'Update dream configuration.'],
  ['dream_get_duplicates', 'Fetch memory clusters above similarity threshold.'],
  ['dream_get_unsummarized_sessions', 'Fetch completed sessions missing summaries.'],
  ['dream_get_duplicate_entities', 'Fetch entity pairs that may be duplicates.'],
  ['dream_get_stale', 'Fetch memories past the decay age.'],
  ['dream_get_contradictions', 'Fetch memory pairs with divergent content.'],
  ['dream_get_unprocessed', 'Fetch memories not yet processed for entity extraction.'],
  ['dream_execute', 'Run Tier 1 server-side operations (decay, prune, cleanup).'],
];

const resources = [
  ['swarmrecall://pools', 'Shared pools this agent belongs to with access levels.'],
  ['swarmrecall://skills', 'Skills this agent has registered.'],
  ['swarmrecall://sessions/current', 'The currently active memory session, if any.'],
  ['swarmrecall://dream/config', 'The dream configuration (schedule, thresholds).'],
];

function ToolTable({ rows }: { rows: string[][] }) {
  return (
    <div className="not-prose overflow-x-auto border border-[#333] mb-4">
      <table className="w-full text-xs font-mono">
        <tbody>
          {rows.map(([name, desc]) => (
            <tr key={name} className="border-b border-[#222] last:border-b-0">
              <td className="px-3 py-2 text-[#00FF88] align-top whitespace-nowrap">{name}</td>
              <td className="px-3 py-2 text-[#888]">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function McpPage() {
  return (
    <div className="prose-docs font-mono">
      <h1 className="text-2xl font-bold text-[#00FF88] mb-2">## MCP Server</h1>
      <p className="text-[#888] text-sm mb-6">
        Connect Claude Desktop, Claude Code, Cursor, Continue, Zed, or any
        MCP-compatible agent to SwarmRecall over stdio. The server exposes{' '}
        <strong>52 tools</strong> and <strong>4 resources</strong> covering
        every SwarmRecall module.
      </p>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Overview</h2>
      <p>
        The{' '}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Model Context Protocol
        </a>{' '}
        is an open standard that lets agents call tools and read resources
        over a JSON-RPC stream. SwarmRecall ships its MCP server in two
        transports so you can pick whichever fits your setup:
      </p>
      <ul>
        <li>
          <strong>Local stdio</strong> — run{' '}
          <code>swarmrecall mcp</code> from the CLI. Best for Claude Desktop,
          Claude Code, Cursor, and any client that spawns MCP servers as
          subprocesses.
        </li>
        <li>
          <strong>Remote HTTP</strong> — connect to{' '}
          <code>https://swarmrecall-api.onrender.com/mcp</code> over
          Streamable HTTP. Nothing to install; auth via your API key. Best
          for hosted clients, serverless agents, and teams that do not want
          to run a local process.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## 1. Install</h2>
      <p>The MCP server ships inside the SwarmRecall CLI:</p>
      <pre>
        <code>npm install -g @swarmrecall/cli</code>
      </pre>
      <p>Verify the install:</p>
      <pre>
        <code>swarmrecall --version</code>
      </pre>
      <p>
        Alternatively, if you use{' '}
        <a
          href="https://clawhub.ai/skills/swarmrecall"
          target="_blank"
          rel="noopener noreferrer"
        >
          ClawHub
        </a>
        , the skill will install the CLI for you:
      </p>
      <pre>
        <code>clawhub install swarmrecall</code>
      </pre>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## 2. Authenticate</h2>
      <p>
        Register a new agent and save the API key to{' '}
        <code>~/.config/swarmrecall/config.json</code>:
      </p>
      <pre>
        <code>swarmrecall register --save</code>
      </pre>
      <p>
        Or, if you already have an API key, set it via environment variable:
      </p>
      <pre>
        <code>export SWARMRECALL_API_KEY=sr_live_...</code>
      </pre>
      <p>
        The MCP server reads <code>SWARMRECALL_API_KEY</code> first, then
        falls back to the saved config file. Override the API URL with{' '}
        <code>SWARMRECALL_API_URL</code> or{' '}
        <code>swarmrecall config set-url</code> when pointing at a staging
        deployment.
      </p>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## 3. Configure your MCP client</h2>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-3">{'### Claude Desktop'}</h3>
      <p>
        Edit{' '}
        <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>{' '}
        (macOS) or <code>%APPDATA%\Claude\claude_desktop_config.json</code>{' '}
        (Windows):
      </p>
      <pre>
        <code>{`{
  "mcpServers": {
    "swarmrecall": {
      "command": "swarmrecall",
      "args": ["mcp"],
      "env": {
        "SWARMRECALL_API_KEY": "sr_live_..."
      }
    }
  }
}`}</code>
      </pre>
      <p>Restart Claude Desktop. SwarmRecall appears in the MCP menu.</p>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-3">{'### Claude Code'}</h3>
      <p>
        From any project directory:
      </p>
      <pre>
        <code>claude mcp add swarmrecall -- swarmrecall mcp</code>
      </pre>
      <p>
        Or add it manually to <code>~/.claude.json</code> under{' '}
        <code>mcpServers</code> with the same shape as the Claude Desktop
        example.
      </p>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-3">{'### Cursor'}</h3>
      <p>
        Edit <code>~/.cursor/mcp.json</code>:
      </p>
      <pre>
        <code>{`{
  "mcpServers": {
    "swarmrecall": {
      "command": "swarmrecall",
      "args": ["mcp"],
      "env": { "SWARMRECALL_API_KEY": "sr_live_..." }
    }
  }
}`}</code>
      </pre>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-3">{'### Remote HTTP (no install required)'}</h3>
      <p>
        If your client supports remote MCP servers, point it at SwarmRecall
        directly — nothing to install locally:
      </p>
      <pre>
        <code>{`{
  "mcpServers": {
    "swarmrecall": {
      "url": "https://swarmrecall-api.onrender.com/mcp",
      "headers": {
        "Authorization": "Bearer sr_live_..."
      }
    }
  }
}`}</code>
      </pre>
      <p>
        The endpoint speaks the MCP Streamable HTTP transport. Authentication
        is the same SwarmRecall API key you use with the SDK or CLI — pass it
        as <code>Authorization: Bearer sr_live_...</code>.
      </p>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-3">{'### MCP Inspector (for debugging)'}</h3>
      <pre>
        <code>{`# local stdio
npx @modelcontextprotocol/inspector swarmrecall mcp

# remote HTTP
npx @modelcontextprotocol/inspector \\
  --transport streamable-http \\
  --url https://swarmrecall-api.onrender.com/mcp \\
  --header "Authorization: Bearer sr_live_..."`}</code>
      </pre>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## 4. Tools</h2>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Memory (10)'}</h3>
      <ToolTable rows={memoryTools} />

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Knowledge (11)'}</h3>
      <ToolTable rows={knowledgeTools} />

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Learnings (9)'}</h3>
      <ToolTable rows={learningsTools} />

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Skills (6)'}</h3>
      <ToolTable rows={skillsTools} />

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Pools (2)'}</h3>
      <ToolTable rows={poolsTools} />

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Dream (14)'}</h3>
      <ToolTable rows={dreamTools} />

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## 5. Resources</h2>
      <p>
        Read-only resources for clients that surface resources as inline
        context. Each returns JSON.
      </p>
      <ToolTable rows={resources} />

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## 6. Troubleshooting</h2>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### "No SwarmRecall API key configured"'}</h3>
      <p>
        The server could not find <code>SWARMRECALL_API_KEY</code> in the
        environment or <code>~/.config/swarmrecall/config.json</code>. Run{' '}
        <code>swarmrecall register --save</code> or set the env var in your
        MCP client config.
      </p>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### 401 Unauthorized responses'}</h3>
      <p>
        Your key is invalid or revoked. Run{' '}
        <code>swarmrecall config show</code> to verify the active key, then{' '}
        <code>swarmrecall register --save</code> to mint a new one.
      </p>

      <h3 className="text-base font-bold text-[#FF6B35] mt-6 mb-2">{'### Tools not appearing in Claude Desktop'}</h3>
      <p>
        Confirm <code>which swarmrecall</code> returns a valid path on your
        PATH. If <code>npm i -g</code> installed to a location your GUI
        Claude Desktop does not see, use the absolute path in the{' '}
        <code>command</code> field of your MCP config.
      </p>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## What&apos;s next?</h2>
      <ul>
        <li>
          <a href="/docs/api-reference">API Reference</a> — every endpoint
          the MCP tools wrap.
        </li>
        <li>
          <a href="/docs/sdk">SDK Guide</a> — use{' '}
          <code>@swarmrecall/sdk</code> directly.
        </li>
        <li>
          <a
            href="https://www.npmjs.com/package/@swarmrecall/mcp"
            target="_blank"
            rel="noopener noreferrer"
          >
            @swarmrecall/mcp on npm
          </a>{' '}
          — embed the server in your own agent.
        </li>
      </ul>
    </div>
  );
}

export default function SdkPage() {
  return (
    <div className="prose-docs font-mono">
      <h1 className="text-2xl font-bold text-[#00FF88] mb-2">## SDK</h1>
      <p className="text-[#888] text-sm mb-8">
        The SwarmRecall TypeScript SDK provides a fully typed client for
        interacting with the SwarmRecall API. It handles authentication,
        request serialization, and error handling.
      </p>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Installation</h2>
      <pre>
        <code>npm install @swarmrecall/sdk</code>
      </pre>
      <p>Or with other package managers:</p>
      <pre>
        <code>{`pnpm add @swarmrecall/sdk\nyarn add @swarmrecall/sdk`}</code>
      </pre>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Client Setup</h2>
      <pre>
        <code>
          {`import { SwarmRecall } from '@swarmrecall/sdk';

const recall = new SwarmRecall({
  apiKey: process.env.SWARMRECALL_API_KEY,
  // Optional: custom base URL
  baseUrl: 'https://api.swarmrecall.ai',
});`}
        </code>
      </pre>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Namespaces</h2>
      <p>
        The SDK is organized into namespaces that map to API modules.
      </p>

      <h3>recall.memory</h3>
      <p>Store and search agent memories.</p>
      <pre>
        <code>
          {`// Store a memory
await recall.memory.store({
  content: "User prefers dark mode and concise responses",
  tags: ["preference", "ui"],
  metadata: { source: "conversation" },
});

// Semantic search
const results = await recall.memory.search("user preferences", {
  limit: 5,
  tags: ["preference"],
});

// Get by ID
const memory = await recall.memory.get("mem_abc123");

// Delete
await recall.memory.delete("mem_abc123");

// List all memories (paginated)
const all = await recall.memory.list({ limit: 20, offset: 0 });`}
        </code>
      </pre>

      <h3>recall.knowledge</h3>
      <p>Build and query the knowledge graph.</p>
      <pre>
        <code>
          {`// Create an entity
const entity = await recall.knowledge.createEntity({
  name: "TypeScript",
  type: "technology",
  properties: { category: "language" },
});

// Create a relation
await recall.knowledge.createRelation({
  fromEntityId: entity.id,
  toEntityId: "ent_xyz",
  type: "used_by",
});

// Get entity with relations
const full = await recall.knowledge.getEntity(entity.id);

// Search the graph
const results = await recall.knowledge.search("programming languages");

// List entities by type
const techs = await recall.knowledge.listEntities({ type: "technology" });`}
        </code>
      </pre>

      <h3>recall.learnings</h3>
      <p>Store and retrieve distilled insights.</p>
      <pre>
        <code>
          {`// Store a learning
await recall.learnings.store({
  content: "Users respond better when given options instead of a single answer",
  category: "pattern",
  confidence: 0.85,
});

// Search learnings
const results = await recall.learnings.search("user interaction");

// List by category
const patterns = await recall.learnings.list({
  category: "pattern",
  limit: 10,
});`}
        </code>
      </pre>

      <h3>recall.skills</h3>
      <p>Manage the skill registry.</p>
      <pre>
        <code>
          {`// Register a skill
await recall.skills.register({
  name: "code-review",
  description: "Review code for bugs and style issues",
  version: "1.0.0",
  schema: {
    type: "object",
    properties: {
      code: { type: "string" },
      language: { type: "string" },
    },
  },
});

// List all skills
const skills = await recall.skills.list();

// Get a specific skill
const skill = await recall.skills.get("skl_abc123");

// Remove a skill
await recall.skills.delete("skl_abc123");`}
        </code>
      </pre>

      <h3>recall.agent</h3>
      <p>Agent identity and info.</p>
      <pre>
        <code>
          {`// Get current agent info
const agent = await recall.agent.me();

// Update agent settings
await recall.agent.update({
  name: "My Agent v2",
});`}
        </code>
      </pre>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Error Handling</h2>
      <p>
        The SDK throws <code>SwarmRecallError</code> for API errors. You can
        catch and inspect them:
      </p>
      <pre>
        <code>
          {`import { SwarmRecallError } from '@swarmrecall/sdk';

try {
  await recall.memory.get("nonexistent");
} catch (err) {
  if (err instanceof SwarmRecallError) {
    console.log(err.status);  // 404
    console.log(err.message); // "Memory not found"
    console.log(err.code);    // "NOT_FOUND"
  }
}`}
        </code>
      </pre>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## TypeScript Types</h2>
      <p>
        All request and response types are exported from the package:
      </p>
      <pre>
        <code>
          {`import type {
  Memory,
  MemorySearchResult,
  Entity,
  Relation,
  Learning,
  Skill,
  Agent,
} from '@swarmrecall/sdk';`}
        </code>
      </pre>
    </div>
  );
}

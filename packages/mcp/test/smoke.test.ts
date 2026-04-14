import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { createMcpServer } from "../src/index.js";

function buildStubClient(): SwarmRecallClient {
  const stub = {
    memory: {
      search: async (query: string, options?: { limit?: number; minScore?: number }) => ({
        data: [
          {
            item: {
              id: "mem-1",
              content: `echo: ${query}`,
              category: "fact",
              importance: 0.5,
              tags: [],
              createdAt: "2026-04-14T00:00:00.000Z",
            },
            score: 0.9,
          },
        ],
        _callArgs: { query, options },
      }),
      sessions: {
        current: async () => ({
          id: "sess-current",
          startedAt: "2026-04-14T00:00:00.000Z",
        }),
      },
    },
    pools: {
      list: async () => ({
        data: [
          {
            id: "pool-1",
            name: "default",
            memoryAccess: "readwrite",
            knowledgeAccess: "readwrite",
            learningsAccess: "readwrite",
            skillsAccess: "readwrite",
            joinedAt: "2026-04-14T00:00:00.000Z",
          },
        ],
      }),
    },
    skills: {
      list: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
    },
    dream: {
      getConfig: async () => ({ enabled: false, intervalHours: 24, operations: [] }),
    },
  };
  return stub as unknown as SwarmRecallClient;
}

async function withConnectedClient(
  stubClient: SwarmRecallClient,
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const server = createMcpServer({ client: stubClient });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "smoke-test", version: "0.0.1" }, {});
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

test("server exposes memory, knowledge, learnings, skills, pools, and dream tools", async () => {
  await withConnectedClient(buildStubClient(), async (client) => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));

    assert.ok(names.size >= 52, `expected at least 52 tools, got ${names.size}`);

    for (const required of [
      "memory_store",
      "memory_search",
      "memory_sessions_current",
      "knowledge_entity_create",
      "knowledge_traverse",
      "knowledge_search",
      "learning_log",
      "learning_patterns",
      "skill_suggest",
      "pool_list",
      "pool_get",
      "dream_start",
      "dream_execute",
    ]) {
      assert.ok(names.has(required), `missing tool: ${required}`);
    }
  });
});

test("memory_search calls the SDK and returns text content", async () => {
  await withConnectedClient(buildStubClient(), async (client) => {
    const result = await client.callTool({
      name: "memory_search",
      arguments: { query: "dark mode", limit: 3 },
    });

    assert.equal(result.isError, undefined);
    const content = result.content as Array<{ type: string; text: string }>;
    assert.equal(content.length, 1);
    assert.equal(content[0].type, "text");
    const parsed = JSON.parse(content[0].text);
    assert.equal(parsed.data[0].item.content, "echo: dark mode");
  });
});

test("pool_list calls the SDK and returns text content", async () => {
  await withConnectedClient(buildStubClient(), async (client) => {
    const result = await client.callTool({ name: "pool_list", arguments: {} });
    assert.equal(result.isError, undefined);
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    assert.equal(parsed.data[0].id, "pool-1");
  });
});

test("server exposes the expected resources", async () => {
  await withConnectedClient(buildStubClient(), async (client) => {
    const { resources } = await client.listResources();
    const uris = new Set(resources.map((r) => r.uri));
    assert.ok(uris.has("swarmrecall://pools"));
    assert.ok(uris.has("swarmrecall://skills"));
    assert.ok(uris.has("swarmrecall://sessions/current"));
    assert.ok(uris.has("swarmrecall://dream/config"));
  });
});

test("reading swarmrecall://pools returns JSON from the stub", async () => {
  await withConnectedClient(buildStubClient(), async (client) => {
    const result = await client.readResource({ uri: "swarmrecall://pools" });
    const content = result.contents[0] as { uri: string; text: string; mimeType?: string };
    const parsed = JSON.parse(content.text);
    assert.equal(parsed.data[0].name, "default");
  });
});

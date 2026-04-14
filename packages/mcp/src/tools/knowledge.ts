import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { z } from "zod";
import { asToolText, safeHandler } from "../types.js";

export function registerKnowledgeTools(server: McpServer, client: SwarmRecallClient): void {
  // --- Entities ---

  server.registerTool(
    "knowledge_entity_create",
    {
      description:
        "Create a new knowledge-graph entity (e.g. person, project, tool, concept).",
      inputSchema: {
        type: z.string().min(1).describe("Entity type (e.g. 'person', 'project')"),
        name: z.string().min(1).describe("Entity name"),
        properties: z
          .record(z.unknown())
          .optional()
          .describe("Structured properties"),
        poolId: z.string().optional().describe("Write to a shared pool"),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.knowledge.entities.create(args)),
    ),
  );

  server.registerTool(
    "knowledge_entity_get",
    {
      description:
        "Fetch an entity by ID, including its outgoing relations with pool context.",
      inputSchema: {
        id: z.string().min(1).describe("Entity ID"),
      },
    },
    safeHandler(async ({ id }) =>
      asToolText(await client.knowledge.entities.get(id)),
    ),
  );

  server.registerTool(
    "knowledge_entity_list",
    {
      description: "List knowledge-graph entities with optional filtering.",
      inputSchema: {
        type: z.string().optional().describe("Filter by entity type"),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
        includeArchived: z.boolean().optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.knowledge.entities.list(args)),
    ),
  );

  server.registerTool(
    "knowledge_entity_update",
    {
      description: "Update an entity's name, properties, or archived flag.",
      inputSchema: {
        id: z.string().min(1).describe("Entity ID"),
        name: z.string().optional(),
        properties: z.record(z.unknown()).optional(),
        archived: z.boolean().optional(),
      },
    },
    safeHandler(async ({ id, ...params }) =>
      asToolText(await client.knowledge.entities.update(id, params)),
    ),
  );

  server.registerTool(
    "knowledge_entity_delete",
    {
      description: "Permanently delete an entity (and its relations).",
      inputSchema: {
        id: z.string().min(1).describe("Entity ID"),
      },
    },
    safeHandler(async ({ id }) =>
      asToolText(await client.knowledge.entities.delete(id)),
    ),
  );

  // --- Relations ---

  server.registerTool(
    "knowledge_relation_create",
    {
      description:
        "Create a directed relation between two entities (e.g. 'alice' works_on 'project-x').",
      inputSchema: {
        fromEntityId: z.string().min(1).describe("Source entity ID"),
        toEntityId: z.string().min(1).describe("Target entity ID"),
        relation: z.string().min(1).describe("Relation type (e.g. 'works_on')"),
        properties: z.record(z.unknown()).optional(),
        poolId: z.string().optional().describe("Write to a shared pool"),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.knowledge.relations.create(args)),
    ),
  );

  server.registerTool(
    "knowledge_relation_list",
    {
      description: "List relations, optionally filtered to an entity or relation type.",
      inputSchema: {
        entityId: z.string().optional().describe("Filter by entity ID (either end)"),
        relation: z.string().optional().describe("Filter by relation type"),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.knowledge.relations.list(args)),
    ),
  );

  server.registerTool(
    "knowledge_relation_delete",
    {
      description: "Delete a relation by ID.",
      inputSchema: {
        id: z.string().min(1).describe("Relation ID"),
      },
    },
    safeHandler(async ({ id }) =>
      asToolText(await client.knowledge.relations.delete(id)),
    ),
  );

  // --- Graph ops ---

  server.registerTool(
    "knowledge_traverse",
    {
      description:
        "Traverse the knowledge graph from a starting entity, optionally filtered by relation type and depth.",
      inputSchema: {
        startId: z.string().min(1).describe("Starting entity ID"),
        relation: z.string().optional().describe("Only follow this relation type"),
        depth: z.number().int().min(1).max(10).optional().describe("Traversal depth"),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) => asToolText(await client.knowledge.traverse(args))),
  );

  server.registerTool(
    "knowledge_search",
    {
      description: "Semantic search across knowledge-graph entities.",
      inputSchema: {
        query: z.string().min(1).describe("Search query"),
        limit: z.number().int().min(1).max(100).optional(),
        minScore: z.number().min(0).max(1).optional(),
      },
    },
    safeHandler(async ({ query, limit, minScore }) =>
      asToolText(await client.knowledge.search(query, { limit, minScore })),
    ),
  );

  server.registerTool(
    "knowledge_validate",
    {
      description:
        "Validate the knowledge graph against defined constraints. Reports any violations.",
      inputSchema: {},
    },
    safeHandler(async () => asToolText(await client.knowledge.validate())),
  );
}

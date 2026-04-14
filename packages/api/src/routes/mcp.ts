import { Hono } from 'hono';
import { SwarmRecallClient } from '@swarmrecall/sdk';
import { handleMcpHttpRequest } from '@swarmrecall/mcp/http';

const router = new Hono();

/**
 * Remote MCP server endpoint. Clients connect by pointing their MCP transport
 * at this URL with `Authorization: Bearer <SWARMRECALL_API_KEY>`. Each request
 * is handled statelessly: a fresh MCP server is constructed, bound to a
 * SwarmRecallClient that loops back through this API with the caller's key,
 * and torn down when the response is sent.
 */
router.all('/', async (c) => {
  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const internalBase =
    process.env.SWARMRECALL_INTERNAL_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3300'}`;

  const client = new SwarmRecallClient({
    apiKey: token,
    baseUrl: internalBase,
  });

  return handleMcpHttpRequest(c.req.raw, { client });
});

export default router;

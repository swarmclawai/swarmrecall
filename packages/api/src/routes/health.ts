import { Hono } from 'hono';
import { pool } from '../db/client.js';

const health = new Hono();

health.get('/', async (c) => {
  let dbOk = false;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch {
    // db unavailable
  }

  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { database: dbOk },
  });
});

export default health;

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { getDatabaseUrl, loadLocalEnv } from '../lib/env.js';

loadLocalEnv();

const pool = new pg.Pool({
  connectionString: getDatabaseUrl(),
});

export const db = drizzle(pool, { schema });
export { pool };

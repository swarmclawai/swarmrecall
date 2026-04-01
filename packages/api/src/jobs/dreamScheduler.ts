import { eq, and, or, isNull, sql, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dreamConfigs, dreamCycles } from '../db/schema.js';
import { startDreamCycle, executeTier1, updateDreamCycle } from '../services/dream.js';

const SCHEDULER_CHECK_INTERVAL_MS = Number(
  process.env.DREAM_SCHEDULER_CHECK_INTERVAL_MS ?? 300_000,
);
const CYCLE_TIMEOUT_MS = Number(process.env.DREAM_CYCLE_TIMEOUT_MS ?? 1_800_000);

async function markStaleCycles() {
  const cutoff = new Date(Date.now() - CYCLE_TIMEOUT_MS);
  const stale = await db
    .select({ id: dreamCycles.id, ownerId: dreamCycles.ownerId })
    .from(dreamCycles)
    .where(
      and(
        eq(dreamCycles.status, 'running'),
        lt(dreamCycles.startedAt, cutoff),
      ),
    );

  for (const cycle of stale) {
    await updateDreamCycle(cycle.id, cycle.ownerId, {
      status: 'failed',
      error: 'Cycle timed out',
    }).catch((err) => console.error('Failed to mark stale cycle:', err));
  }

  if (stale.length > 0) {
    console.log(`Dream scheduler: marked ${stale.length} stale cycle(s) as failed`);
  }
}

async function checkAndRunDueDreams() {
  try {
    // First, clean up stale cycles
    await markStaleCycles();

    // Find configs that are due for a dream
    const dueConfigs = await db
      .select()
      .from(dreamConfigs)
      .where(
        and(
          eq(dreamConfigs.enabled, 'true'),
          or(
            isNull(dreamConfigs.lastDreamAt),
            sql`${dreamConfigs.lastDreamAt} + (${dreamConfigs.intervalHours} || ' hours')::interval < NOW()`,
          ),
        ),
      );

    for (const config of dueConfigs) {
      if (!config.agentId) continue;

      // Check for already-running cycle
      const [running] = await db
        .select({ id: dreamCycles.id })
        .from(dreamCycles)
        .where(
          and(
            eq(dreamCycles.agentId, config.agentId),
            eq(dreamCycles.status, 'running'),
          ),
        )
        .limit(1);

      if (running) continue;

      try {
        const cycle = await startDreamCycle({
          agentId: config.agentId,
          poolId: config.poolId,
          ownerId: config.ownerId,
          trigger: 'scheduled',
        });

        const result = await executeTier1(
          config.agentId,
          config.ownerId,
          (config.thresholds ?? {}) as Record<string, number>,
        );

        await updateDreamCycle(cycle.id, config.ownerId, {
          status: 'completed',
          results: result as Record<string, unknown>,
        });

        console.log(`Dream scheduler: completed cycle for agent ${config.agentId}`);
      } catch (err) {
        console.error(`Dream scheduler: failed for agent ${config.agentId}:`, err);
      }
    }
  } catch (err) {
    console.error('Dream scheduler: check failed:', err);
  }
}

export function startDreamScheduler() {
  if (process.env.DREAM_SCHEDULER_ENABLED !== 'true') {
    console.log('Dream scheduler disabled (set DREAM_SCHEDULER_ENABLED=true to enable)');
    return;
  }

  console.log(
    `Dream scheduler started (check interval: ${SCHEDULER_CHECK_INTERVAL_MS}ms)`,
  );
  setInterval(checkAndRunDueDreams, SCHEDULER_CHECK_INTERVAL_MS);
}

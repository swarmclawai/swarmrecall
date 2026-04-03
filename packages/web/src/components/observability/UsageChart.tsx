'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { UsageMetrics } from '@swarmrecall/shared';

export function UsageChart({ data }: { data: UsageMetrics | null }) {
  if (!data || data.series.length === 0) {
    return (
      <div className="terminal-card">
        <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Usage Growth</h3>
        <p className="text-xs text-[#555] font-mono">No data available yet.</p>
      </div>
    );
  }

  return (
    <div className="terminal-card">
      <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Usage Growth</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data.series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="date"
            stroke="#555"
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
          />
          <YAxis
            stroke="#555"
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111',
              border: '1px solid #333',
              borderRadius: 0,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
            labelStyle={{ color: '#E0E0E0' }}
          />
          <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12 }} />
          <Line type="monotone" dataKey="memories" stroke="#3b82f6" name="Memories" dot={false} />
          <Line type="monotone" dataKey="entities" stroke="#a855f7" name="Entities" dot={false} />
          <Line type="monotone" dataKey="learnings" stroke="#f59e0b" name="Learnings" dot={false} />
          <Line type="monotone" dataKey="skills" stroke="#00FF88" name="Skills" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

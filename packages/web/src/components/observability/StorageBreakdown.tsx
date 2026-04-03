'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { StorageBreakdown as StorageBreakdownType } from '@swarmrecall/shared';

const COLORS = ['#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#00FF88', '#555555'];

export function StorageBreakdownChart({ data }: { data: StorageBreakdownType | null }) {
  if (!data) {
    return (
      <div className="terminal-card">
        <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Storage Breakdown</h3>
        <p className="text-xs text-[#555] font-mono">Loading...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Memories', count: data.memories.count, size: data.memories.estimatedSizeMb },
    { name: 'Entities', count: data.entities.count, size: data.entities.estimatedSizeMb },
    { name: 'Relations', count: data.relations.count, size: data.relations.estimatedSizeMb },
    { name: 'Learnings', count: data.learnings.count, size: data.learnings.estimatedSizeMb },
    { name: 'Skills', count: data.skills.count, size: data.skills.estimatedSizeMb },
    { name: 'Audit Log', count: data.auditLog.count, size: data.auditLog.estimatedSizeMb },
  ].filter((d) => d.count > 0);

  return (
    <div className="terminal-card">
      <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Storage Breakdown</h3>

      <div className="flex items-start gap-6">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="size"
                nameKey="name"
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111',
                  border: '1px solid #333',
                  borderRadius: 0,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
                formatter={(value) => `${Number(value).toFixed(2)} MB`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}

        <div className="flex-1 space-y-2">
          {chartData.map((item, idx) => (
            <div key={item.name} className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-[#E0E0E0]">{item.name}</span>
              </div>
              <span className="text-[#888]">
                {item.count.toLocaleString()} rows &middot; {item.size.toFixed(2)} MB
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-[#333] flex items-center justify-between text-xs font-mono">
            <span className="text-[#00FF88]">Total</span>
            <span className="text-[#00FF88]">{data.totalEstimatedSizeMb.toFixed(2)} MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

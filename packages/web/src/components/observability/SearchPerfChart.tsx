'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SearchMetricsSummary } from '@swarmrecall/shared';

export function SearchPerfChart({ data }: { data: SearchMetricsSummary | null }) {
  if (!data) {
    return (
      <div className="terminal-card">
        <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Search Performance</h3>
        <p className="text-xs text-[#555] font-mono">Loading...</p>
      </div>
    );
  }

  if (data.totalSearches === 0) {
    return (
      <div className="terminal-card">
        <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Search Performance</h3>
        <p className="text-xs text-[#555] font-mono">No search data in this time range.</p>
      </div>
    );
  }

  return (
    <div className="terminal-card">
      <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">Search Performance</h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 bg-[#0A0A0A] border border-[#333]">
          <p className="text-xs text-[#555] font-mono">Total Searches</p>
          <p className="text-lg font-mono font-medium text-[#E0E0E0]">{data.totalSearches}</p>
        </div>
        <div className="p-2 bg-[#0A0A0A] border border-[#333]">
          <p className="text-xs text-[#555] font-mono">Avg Latency</p>
          <p className="text-lg font-mono font-medium text-[#E0E0E0]">{data.avgDurationMs}ms</p>
        </div>
        <div className="p-2 bg-[#0A0A0A] border border-[#333]">
          <p className="text-xs text-[#555] font-mono">Avg Results</p>
          <p className="text-lg font-mono font-medium text-[#E0E0E0]">{data.avgResultCount}</p>
        </div>
      </div>

      {/* By method chart */}
      {data.byMethod.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.byMethod} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              type="number"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              type="category"
              dataKey="method"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
              width={70}
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
            <Bar dataKey="count" fill="#3b82f6" name="Searches" />
            <Bar dataKey="avgDurationMs" fill="#00FF88" name="Avg Latency (ms)" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* By index table */}
      {data.byIndex.length > 0 && (
        <div className="mt-4 border-t border-[#333] pt-4">
          <h4 className="text-xs font-medium text-[#888] font-mono mb-2">By Index</h4>
          <div className="space-y-1">
            {data.byIndex.map((idx) => (
              <div key={idx.indexName} className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#E0E0E0]">{idx.indexName}</span>
                <span className="text-[#888]">
                  {idx.count} queries &middot; {idx.avgDurationMs}ms avg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

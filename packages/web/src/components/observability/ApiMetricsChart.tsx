'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ApiMetricsSummary } from '@swarmrecall/shared';

function formatHour(hour: string) {
  try {
    const d = new Date(hour);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return hour;
  }
}

export function ApiMetricsChart({ data }: { data: ApiMetricsSummary | null }) {
  if (!data) {
    return (
      <div className="terminal-card">
        <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">API Metrics</h3>
        <p className="text-xs text-[#555] font-mono">Loading...</p>
      </div>
    );
  }

  const chartData = data.series.map((s) => ({ ...s, hour: formatHour(s.hour) }));

  return (
    <div className="terminal-card">
      <h3 className="text-sm font-medium text-[#E0E0E0] font-mono mb-4">API Metrics</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        <StatCard label="Total Requests" value={data.totalRequests.toLocaleString()} />
        <StatCard label="Avg Latency" value={`${data.avgDurationMs}ms`} />
        <StatCard label="P95 Latency" value={`${data.p95DurationMs}ms`} />
        <StatCard
          label="Error Rate"
          value={`${(data.errorRate * 100).toFixed(1)}%`}
          alert={data.errorRate > 0.05}
        />
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="hour"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis
              yAxisId="count"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              yAxisId="duration"
              orientation="right"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
              unit="ms"
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
            <Bar yAxisId="count" dataKey="count" fill="#3b82f6" name="Requests" opacity={0.7} />
            <Line
              yAxisId="duration"
              type="monotone"
              dataKey="avgDurationMs"
              stroke="#00FF88"
              name="Avg Latency (ms)"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-[#555] font-mono">No request data in this time range.</p>
      )}

      {/* Top paths table */}
      {data.byPath.length > 0 && (
        <div className="mt-4 border-t border-[#333] pt-4">
          <h4 className="text-xs font-medium text-[#888] font-mono mb-2">Top Endpoints</h4>
          <div className="space-y-1">
            {data.byPath.slice(0, 8).map((p) => (
              <div key={p.path} className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#E0E0E0] truncate max-w-[60%]">{p.path}</span>
                <span className="text-[#888]">
                  {p.count} req &middot; {p.avgDurationMs}ms avg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="p-2 bg-[#0A0A0A] border border-[#333]">
      <p className="text-xs text-[#555] font-mono">{label}</p>
      <p className={`text-lg font-mono font-medium ${alert ? 'text-[#FF4444]' : 'text-[#E0E0E0]'}`}>
        {value}
      </p>
    </div>
  );
}

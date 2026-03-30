"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { AssetRecord } from "@/types";
import { PERSON_LABELS } from "@/types";

interface AssetLineChartProps {
  data: AssetRecord[];
}

interface TooltipEntry { name: string; color: string; value: number; }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; }

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AssetLineChart({ data }: AssetLineChartProps) {
  // Group by year-month and pivot by person
  const grouped: Record<string, Record<string, number>> = {};
  for (const r of data) {
    const key = `${r.year}.${String(r.month).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][PERSON_LABELS[r.person] ?? r.person] = r.total ?? 0;
  }

  const chartData = Object.entries(grouped).map(([name, values]) => ({
    name,
    ...values,
  }));

  const persons = Array.from(new Set(data.map((r) => PERSON_LABELS[r.person] ?? r.person)));
  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-4))"];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickFormatter={(v) => `${(v / 100000000).toFixed(1)}억`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        {persons.map((person, i) => (
          <Line
            key={person}
            type="monotone"
            dataKey={person}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

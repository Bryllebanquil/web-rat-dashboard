import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { chartColor } from '@/lib/colors';
import React from 'react';

export type DoughnutDatum = { name: string; value: number; colorIndex?: number };

interface DoughnutChartProps {
  title?: string;
  data: DoughnutDatum[];
  totalLabel?: string;
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({ title, data, totalLabel }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="relative h-64 w-full">
      {title && (
        <div className="mb-2 text-sm text-muted-foreground">{title}</div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={84}
            paddingAngle={2}
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`slice-${index}`} fill={chartColor(entry.colorIndex ?? index)} />
            ))}
          </Pie>
          <Tooltip wrapperStyle={{ zIndex: 50 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold">{total}</div>
          {totalLabel && (
            <div className="text-xs text-muted-foreground mt-1">{totalLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoughnutChart;

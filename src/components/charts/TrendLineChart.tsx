import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { chartColor } from '@/lib/colors';

export interface SeriesConfig {
  dataKey: string;
  name: string;
  colorIndex: number;
}

interface TrendLineChartProps<T extends Record<string, any>> {
  data: T[];
  series: SeriesConfig[];
}

export const TrendLineChart: React.FC<TrendLineChartProps<any>> = ({ data, series }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip wrapperStyle={{ zIndex: 50 }} />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={chartColor(s.colorIndex)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendLineChart;

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { getWorkshopFamilyColor } from '@/lib/badge-utils';

interface ChartDataPoint {
  date: string;
  total?: number;
  [key: string]: number | string | undefined;
}

interface DashboardChartProps {
  data: ChartDataPoint[];
  title: string;
  dataLabel: string;
  families?: string[];
}

export function DashboardChart({ data, title, dataLabel, families = ['FDFP', 'HD'] }: DashboardChartProps) {
  const [viewMode, setViewMode] = useState<'recent' | 'all'>('recent');

  const displayData = viewMode === 'recent' ? data.slice(-6) : data;

  const familyColors = useMemo(() => {
    const colors: Record<string, string> = {};
    families.forEach(family => {
      colors[family] = getWorkshopFamilyColor(family);
    });
    return colors;
  }, [families]);

  const hasFamilyData = useMemo(() => {
    const familyHasData: Record<string, boolean> = {};
    families.forEach(family => {
      familyHasData[family] = displayData.some(point => (point[family] as number) > 0);
    });
    return familyHasData;
  }, [displayData, families]);

  return (
    <div className="mt-4 p-6 bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl border border-border/50 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex gap-1 bg-background/60 backdrop-blur-sm p-1 rounded-lg border border-border/50">
          <Button
            variant={viewMode === 'recent' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('recent')}
            className="h-7 text-xs px-3 transition-all duration-200"
          >
            6 derniers mois
          </Button>
          <Button
            variant={viewMode === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('all')}
            className="h-7 text-xs px-3 transition-all duration-200"
          >
            Toute la période
          </Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={displayData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            {families.map(family => (
              <linearGradient key={family} id={`color${family}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={familyColors[family]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={familyColors[family]} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="stroke-border/30"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              const date = parseISO(value);
              return format(date, 'MMM yy', { locale: fr });
            }}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted-foreground"
            tickLine={false}
            axisLine={{ strokeWidth: 1, className: 'stroke-border/50' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const date = parseISO(payload[0].payload.date);
                const totalValue = payload[0].payload.total;

                return (
                  <div className="bg-background/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
                    <p className="text-xs font-semibold mb-2 text-foreground">
                      {format(date, 'MMMM yyyy', { locale: fr })}
                    </p>
                    <div className="space-y-1.5">
                      {families.map(family => (
                        <div key={family} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: familyColors[family] }}
                            />
                            <span className="text-xs text-muted-foreground">{family}</span>
                          </div>
                          <span className="text-xs font-semibold tabular-nums" style={{ color: familyColors[family] }}>
                            {payload[0].payload[family]}
                          </span>
                        </div>
                      ))}
                      <div className="pt-1.5 mt-1.5 border-t border-border/50">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-foreground">Total</span>
                          <span className="text-xs font-bold tabular-nums text-foreground">
                            {totalValue} {dataLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '5 5', className: 'stroke-muted-foreground/20' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
            iconType="circle"
            iconSize={8}
            formatter={(value) => {
              return <span className="text-muted-foreground">{value}</span>;
            }}
          />
          {families.map((family, index) => (
            hasFamilyData[family] && (
              <Area
                key={family}
                type="monotone"
                dataKey={family}
                stackId="1"
                stroke={familyColors[family]}
                strokeWidth={2}
                fill={`url(#color${family})`}
                animationDuration={800}
                animationBegin={index * 100}
                activeDot={{
                  r: 6,
                  fill: familyColors[family],
                  stroke: '#fff',
                  strokeWidth: 2,
                  style: { zIndex: 1000, cursor: 'pointer' },
                }}
              />
            )
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: '#0B1224',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
  padding: '8px 12px',
};

const AXIS_STYLE = {
  fontSize: 11,
  fill: '#64748B',
};

interface BasicProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  formatter?: (v: number) => string;
}

function tooltipFormatter(formatter?: (v: number) => string) {
  return (value: number | string | undefined): [string, string] => {
    const n = typeof value === 'number' ? value : Number(value ?? 0);
    return [formatter ? formatter(n) : String(value ?? ''), ''];
  };
}

export function AreaChartCard({
  data,
  dataKey,
  xKey = 'name',
  color = '#10B981',
  height = 240,
  formatter,
}: BasicProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS_STYLE} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={AXIS_STYLE}
          tickFormatter={(v) => (formatter ? formatter(Number(v)) : String(v))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={tooltipFormatter(formatter)}
          labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineChartCard({
  data,
  dataKey,
  xKey = 'name',
  color = '#10B981',
  height = 240,
  formatter,
}: BasicProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS_STYLE} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={AXIS_STYLE}
          tickFormatter={(v) => (formatter ? formatter(Number(v)) : String(v))}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tooltipFormatter(formatter)} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarChartCard({
  data,
  dataKey,
  xKey = 'name',
  color = '#10B981',
  height = 240,
  formatter,
  secondKey,
  secondColor = '#0EA5E9',
}: BasicProps & { secondKey?: string; secondColor?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS_STYLE} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={AXIS_STYLE}
          tickFormatter={(v) => (formatter ? formatter(Number(v)) : String(v))}
        />
        <Tooltip cursor={{ fill: 'rgba(148,163,184,0.05)' }} contentStyle={TOOLTIP_STYLE} formatter={tooltipFormatter(formatter)} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={32} />
        {secondKey && <Bar dataKey={secondKey} fill={secondColor} radius={[6, 6, 0, 0]} maxBarSize={32} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PiePoint {
  name: string;
  value: number;
  color: string;
}

export function PieChartCard({
  data,
  height = 240,
  centerLabel,
  centerValue,
  innerRadius = 60,
  outerRadius = 90,
}: {
  data: PiePoint[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  innerRadius?: number;
  outerRadius?: number;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | string | undefined, _name, entry) => {
              const n = typeof value === 'number' ? value : Number(value ?? 0);
              const payload = (entry as unknown as { payload?: PiePoint }).payload;
              return [`${n.toLocaleString('de-DE')} ₫`, payload?.name ?? ''];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{centerLabel}</span>}
          {centerValue && <span className="text-white font-bold text-xl">{centerValue}</span>}
        </div>
      )}
    </div>
  );
}

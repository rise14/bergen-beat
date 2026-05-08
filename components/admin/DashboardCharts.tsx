"use client";

// ─── Pure-SVG dashboard charts — no external dependencies ────────────────────

export interface DailyCount {
  date: string;   // "YYYY-MM-DD"
  count: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface StatusCounts {
  published: number;
  draft: number;
  archived: number;
}

interface Props {
  daily: DailyCount[];           // last 30 days
  categories: CategoryCount[];   // top categories by event count
  statuses: StatusCounts;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Bar spark chart (events added per day) ───────────────────────────────────

function DailyBarChart({ data }: { data: DailyCount[] }) {
  const W = 600, H = 90, PAD = 4;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.floor((W - PAD * (data.length + 1)) / data.length);

  // Tick labels: show first, last, and mid
  const labelIdxs = new Set([0, Math.floor(data.length / 2), data.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" aria-label="Events added per day">
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.count / max) * H));
        const x = PAD + i * (barW + PAD);
        const y = H - barH;
        const isToday = i === data.length - 1;
        return (
          <g key={d.date}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={2}
              fill={isToday ? "#1a2e5a" : "#8fabd4"}
              opacity={d.count === 0 ? 0.25 : 1}
            >
              <title>{`${shortDate(d.date)}: ${d.count} event${d.count !== 1 ? "s" : ""} added`}</title>
            </rect>
            {labelIdxs.has(i) && (
              <text
                x={x + barW / 2} y={H + 18}
                textAnchor="middle" fontSize={9} fill="#9ca3af"
              >
                {shortDate(d.date)}
              </text>
            )}
          </g>
        );
      })}
      {/* max line */}
      <text x={W} y={4} textAnchor="end" fontSize={9} fill="#9ca3af">{max}</text>
      <line x1={0} y1={0} x2={W} y2={0} stroke="#f3f4f6" strokeWidth={1} />
    </svg>
  );
}

// ── Horizontal bar chart (events by category) ─────────────────────────────────

const CATEGORY_COLORS = [
  "#1a2e5a", "#8fabd4", "#e87722", "#7c4f2a",
  "#3b6ea8", "#b8cee6", "#c85a00", "#a06a3b",
];

function CategoryChart({ data }: { data: CategoryCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const BAR_H = 14, GAP = 10, LABEL_W = 120, BAR_AREA = 300, NUM_W = 30;
  const totalH = data.length * (BAR_H + GAP);

  return (
    <svg
      viewBox={`0 0 ${LABEL_W + BAR_AREA + NUM_W} ${totalH}`}
      className="w-full"
      aria-label="Events by category"
    >
      {data.map((d, i) => {
        const y = i * (BAR_H + GAP);
        const barW = Math.max(4, Math.round((d.count / max) * BAR_AREA));
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <g key={d.name}>
            <text x={LABEL_W - 6} y={y + BAR_H - 2}
              textAnchor="end" fontSize={11} fill="#374151">
              {d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name}
            </text>
            <rect x={LABEL_W} y={y} width={barW} height={BAR_H} rx={3} fill={color}>
              <title>{`${d.name}: ${d.count} event${d.count !== 1 ? "s" : ""}`}</title>
            </rect>
            <text x={LABEL_W + barW + 5} y={y + BAR_H - 2}
              fontSize={10} fill="#6b7280" fontWeight={500}>
              {d.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut chart (status breakdown) ────────────────────────────────────────────

function DonutChart({ statuses }: { statuses: StatusCounts }) {
  const total = statuses.published + statuses.draft + statuses.archived;
  if (total === 0) return <p className="text-sm text-gray-400">No events yet.</p>;

  const segments = [
    { label: "Published", value: statuses.published, color: "#16a34a" },
    { label: "Draft",     value: statuses.draft,     color: "#d97706" },
    { label: "Archived",  value: statuses.archived,  color: "#9ca3af" },
  ].filter((s) => s.value > 0);

  const R = 40, CX = 50, CY = 50, STROKE = 16;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const arcs = segments.map((s) => {
    const dash = (s.value / total) * circumference;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-24 shrink-0" aria-label="Status breakdown">
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${CX} ${CY})`}
          >
            <title>{`${arc.label}: ${arc.value}`}</title>
          </circle>
        ))}
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1a2e5a">
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="ml-auto font-semibold text-gray-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DashboardCharts({ daily, categories, statuses }: Props) {
  const totalAdded = daily.reduce((s, d) => s + d.count, 0);

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

      {/* Events added per day — spans 2 cols */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 lg:col-span-2">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            Events added (last 30 days)
          </h2>
          <span className="text-xs text-gray-400">
            {totalAdded} total
          </span>
        </div>
        {totalAdded === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No events added in the last 30 days.</p>
        ) : (
          <DailyBarChart data={daily} />
        )}
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Status breakdown
        </h2>
        <DonutChart statuses={statuses} />
      </div>

      {/* Events by category — full width */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 lg:col-span-3">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Events by category
        </h2>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categorised events yet.</p>
        ) : (
          <CategoryChart data={categories} />
        )}
      </div>
    </div>
  );
}

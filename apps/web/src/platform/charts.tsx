import type { DashboardKpi, MetricPoint } from "@platform/shared";

// Reusable chart/aggregation primitive. This is the ONE new platform primitive
// the analytics dashboard required — the table/form engine could not render it.
// Dependency-free (CSS bars) to keep the prototype's footprint honest.

export function KpiCards({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="kpi-grid">
      {kpis.map((k) => (
        <div key={k.key} className="kpi-card">
          <div className="kpi-value">{k.value}</div>
          <div className="kpi-label">{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function maxValue(points: MetricPoint[]): number {
  return points.reduce((m, p) => (p.value > m ? p.value : m), 0) || 1;
}

// Horizontal bars — good for categorical breakdowns (funnel, reasons).
export function BarList({
  points,
  format,
}: {
  points: MetricPoint[];
  format?: (p: MetricPoint) => string;
}) {
  const max = maxValue(points);
  return (
    <div className="bar-list">
      {points.map((p) => (
        <div key={p.label} className="bar-row">
          <span className="bar-label">{p.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(p.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">{format ? format(p) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Vertical columns — good for a value over time (refunds by day).
export function ColumnChart({
  points,
  format,
}: {
  points: MetricPoint[];
  format?: (p: MetricPoint) => string;
}) {
  const max = maxValue(points);
  return (
    <div className="column-chart">
      {points.map((p) => (
        <div key={p.label} className="column">
          <span className="column-track">
            <span
              className="column-fill"
              style={{ height: `${(p.value / max) * 100}%` }}
              title={format ? format(p) : String(p.value)}
            />
          </span>
          <span className="column-label">{p.label.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

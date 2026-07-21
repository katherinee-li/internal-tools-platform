import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@platform/shared";
import { useAuth } from "./auth";
import { EmptyState, ErrorState, Loading } from "./components";
import { BarList, ColumnChart, KpiCards } from "./charts";
import type { DashboardDefinition } from "./dashboardDefinition";

// Generic renderer for ANY dashboard definition: identical loading/error/empty
// and permission handling as ToolPage, but composed from the chart primitive
// instead of the table/form engine.
export function DashboardPage({ def }: { def: DashboardDefinition }) {
  const { api, can } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    def
      .fetch(api)
      .then((d) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load metrics."))
      .finally(() => setLoading(false));
  }, [api, def]);

  useEffect(() => {
    load();
  }, [load]);

  const canRead = can(def.readPermission);

  return (
    <div className="tool-page">
      <header className="tool-header">
        <div>
          <h1>{def.title}</h1>
          <p className="muted">{def.description}</p>
        </div>
      </header>

      {!canRead ? (
        <ErrorState message="You do not have permission to view this tool." />
      ) : loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <EmptyState />
      ) : (
        <>
          <KpiCards kpis={def.kpis(data)} />
          <div className="widget-grid">
            {def.widgets.map((w) => {
              const points = w.select(data);
              return (
                <section key={w.key} className="widget">
                  <h3 className="widget-title">{w.title}</h3>
                  {points.length === 0 ? (
                    <EmptyState label="No data yet." />
                  ) : w.kind === "columns" ? (
                    <ColumnChart points={points} format={w.format} />
                  ) : (
                    <BarList points={points} format={w.format} />
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

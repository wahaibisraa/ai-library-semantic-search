import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, Loader2, AlertCircle } from "lucide-react";
import "./Analytics.css";
import { useI18n } from "./i18n/context.js";
import useChartColors from "./theme/useChartColors.js";

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

// Renders a single P / R / F1 cell: coloured number + mini progress bar.
// Colours are CSS variables, so they follow the light/dark theme.
function MetricCell({ v, bold }) {
  const color =
    v >= 0.6 ? "var(--success)" : v >= 0.35 ? "var(--warning)" : "var(--danger)";
  return (
    <td className="metric-cell">
      <span className="metric-val" style={{ color, fontWeight: bold ? 800 : 600 }}>
        {v.toFixed(3)}
      </span>
      <div className="mini-bar-track">
        <div
          className="mini-bar-fill"
          style={{ width: `${Math.round(v * 100)}%`, background: color }}
        />
      </div>
    </td>
  );
}

function Analytics() {
  const { t, isRTL } = useI18n();
  const colors = useChartColors();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [evalData, setEvalData] = useState(null);
  const [evalLoading, setEvalLoading] = useState(true);
  const [evalError, setEvalError] = useState(false);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/analytics")
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/evaluate")
      .then((res) => setEvalData(res.data))
      .catch(() => setEvalError(true))
      .finally(() => setEvalLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="analytics-state" role="status">
        <Loader2 className="spin" size={36} aria-hidden="true" />
        <p>{t("analytics.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-state error" role="alert">
        <AlertCircle size={36} aria-hidden="true" />
        <p>{t("analytics.error")}</p>
      </div>
    );
  }

  // Category labels that come from the API (modes, months) are translated when known.
  const tLabel = (key, raw) => {
    const value = t(key);
    return value === key ? raw : value;
  };

  // ── Shared chart settings (theme colours + right-to-left mirroring) ──
  const axisTick = { fontSize: 12, fill: colors.axis };
  const tooltipProps = {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${colors.border}`,
      background: colors.surface,
      color: colors.text,
      fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      direction: isRTL ? "rtl" : "ltr",
      textAlign: "start",
    },
    labelStyle: { color: colors.text },
    itemStyle: { color: colors.text },
  };
  const legendProps = { iconType: "circle", iconSize: 10 };
  // In Arabic the category axis runs right-to-left and the value axis sits on the right.
  const yAxisSide = isRTL ? "right" : "left";
  const sideMargin = (inline, outer = 0) =>
    isRTL ? { left: inline, right: outer } : { right: inline, left: outer };

  const totalSearches = data.engagement_trends.reduce(
    (s, r) => s + r.searches,
    0
  );
  const totalBorrows = data.engagement_trends.reduce(
    (s, r) => s + r.borrows,
    0
  );

  const modeData = data.mode_distribution.map((d) => ({
    ...d,
    label: tLabel(`analytics.modes.${d.mode}`, d.mode),
  }));

  const trendData = data.engagement_trends.map((d) => ({
    ...d,
    label: tLabel(`analytics.months.${d.month}`, d.month),
  }));

  const f1ChartData = evalData
    ? evalData.rows.map((r) => ({
        mode: tLabel(`analytics.modes.${r.mode}`, r.mode),
        keyword: r.keyword.f1,
        semantic: r.semantic.f1,
      }))
    : [];

  return (
    <div className="analytics">
      <div className="analytics-header">
        <BarChart2 size={30} aria-hidden="true" />
        <div>
          <h1>{t("analytics.title")}</h1>
          <p>{t("analytics.subtitle")}</p>
        </div>
      </div>

      <div className="stat-row">
        <StatCard label={t("analytics.stats.totalSearches")} value={totalSearches} sub={t("analytics.stats.allStudents")} />
        <StatCard label={t("analytics.stats.totalBorrows")} value={totalBorrows} sub={t("analytics.stats.allStudents")} />
        <StatCard
          label={t("analytics.stats.uniqueTopics")}
          value={data.top_searches.length}
          sub={t("analytics.stats.topResults")}
        />
        <StatCard
          label={t("analytics.stats.modesDetected")}
          value={data.mode_distribution.length}
          sub={t("analytics.stats.queryPatterns")}
        />
      </div>

      <div className="charts-grid">
        {/* ── Top Searched Topics ── */}
        <div className="chart-card span-2">
          <div className="chart-header">
            <h2>{t("analytics.topSearches.title")}</h2>
            <p>{t("analytics.topSearches.sub")}</p>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={data.top_searches}
              margin={{ top: 8, bottom: 64, ...sideMargin(16) }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="topic"
                angle={isRTL ? 32 : -32}
                textAnchor={isRTL ? "start" : "end"}
                tick={axisTick}
                stroke={colors.grid}
                interval={0}
                reversed={isRTL}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                orientation={yAxisSide}
              />
              <Tooltip
                {...tooltipProps}
                cursor={{ fill: colors.cursor }}
                formatter={(v) => [v, t("analytics.topSearches.series")]}
              />
              <Bar dataKey="count" fill={colors.series1} radius={[6, 6, 0, 0]} name={t("analytics.topSearches.series")} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Mode Distribution ── */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>{t("analytics.modeDist.title")}</h2>
            <p>{t("analytics.modeDist.sub")}</p>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={modeData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={48}
                paddingAngle={3}
                stroke={colors.surface}
              >
                {modeData.map((_, i) => (
                  <Cell key={i} fill={colors.series[i % colors.series.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} formatter={(v, name) => [v, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {modeData.map((item, i) => (
              <span key={item.mode} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ background: colors.series[i % colors.series.length] }}
                />
                {item.label}
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* ── Most Recommended Books ── */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>{t("analytics.topBooks.title")}</h2>
            <p>{t("analytics.topBooks.sub")}</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.top_books}
              layout="vertical"
              margin={{ top: 4, bottom: 4, ...sideMargin(20, 4) }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                reversed={isRTL}
              />
              <YAxis
                type="category"
                dataKey="short_title"
                width={118}
                tick={{ ...axisTick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                orientation={yAxisSide}
              />
              <Tooltip
                {...tooltipProps}
                cursor={{ fill: colors.cursor }}
                formatter={(v) => [v, t("analytics.topBooks.series")]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.title ?? ""
                }
              />
              <Bar
                dataKey="count"
                fill={colors.series2}
                radius={isRTL ? [6, 0, 0, 6] : [0, 6, 6, 0]}
                name={t("analytics.topBooks.series")}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Student Engagement Trends ── */}
        <div className="chart-card span-2">
          <div className="chart-header">
            <h2>{t("analytics.trends.title")}</h2>
            <p>{t("analytics.trends.sub")}</p>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart
              data={trendData}
              margin={{ top: 8, bottom: 0, ...sideMargin(16) }}
            >
              <defs>
                <linearGradient id="gradSearch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.series1} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={colors.series1} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBorrow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.series2} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={colors.series2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ ...axisTick, fontSize: 13 }}
                axisLine={false}
                tickLine={false}
                reversed={isRTL}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                orientation={yAxisSide}
              />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} wrapperStyle={{ fontSize: 13, paddingTop: 14 }} />
              <Area
                type="monotone"
                dataKey="searches"
                stroke={colors.series1}
                strokeWidth={2.5}
                fill="url(#gradSearch)"
                name={t("analytics.trends.searches")}
                dot={{ r: 4, fill: colors.series1, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="borrows"
                stroke={colors.series2}
                strokeWidth={2.5}
                fill="url(#gradBorrow)"
                name={t("analytics.trends.borrows")}
                dot={{ r: 4, fill: colors.series2, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ════════════════════════════════════════
          Performance Comparison Section
          ════════════════════════════════════════ */}
      <div className="perf-section">
        <div className="perf-section-header">
          <h2>{t("analytics.perf.title")}</h2>
          <p>{t("analytics.perf.intro")}</p>
        </div>

        {evalLoading ? (
          <div className="analytics-state" style={{ minHeight: "160px" }} role="status">
            <Loader2 className="spin" size={28} aria-hidden="true" />
            <p>{t("analytics.perf.loading")}</p>
          </div>
        ) : evalError ? (
          <div className="analytics-state error" style={{ minHeight: "120px" }} role="alert">
            <AlertCircle size={28} aria-hidden="true" />
            <p>{t("analytics.perf.error")}</p>
          </div>
        ) : (
          <>
            {/* F1 grouped bar chart */}
            <div className="chart-card perf-chart">
              <div className="chart-header">
                <h3>{t("analytics.perf.f1Title")}</h3>
                <p>{t("analytics.perf.f1Sub")}</p>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={f1ChartData}
                  margin={{ top: 8, bottom: 4, ...sideMargin(16) }}
                  barCategoryGap="32%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis
                    dataKey="mode"
                    tick={{ ...axisTick, fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                    reversed={isRTL}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(1)}
                    orientation={yAxisSide}
                  />
                  <Tooltip
                    {...tooltipProps}
                    cursor={{ fill: colors.cursor }}
                    formatter={(v, name) => [v.toFixed(3), name]}
                  />
                  <Legend {...legendProps} wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                  <Bar dataKey="keyword" name={t("analytics.perf.keyword")} fill={colors.baseline} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="semantic" name={t("analytics.perf.semantic")} fill={colors.series1} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Full P / R / F1 detail table */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>{t("analytics.perf.tableTitle")}</h3>
                <p>{t("analytics.perf.tableSub", { k: evalData.k })}</p>
              </div>
              <div className="table-scroll">
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="th-mode">{t("analytics.perf.colMode")}</th>
                      <th rowSpan={2} className="th-center th-narrow">{t("analytics.perf.colQueries")}</th>
                      <th colSpan={6} className="th-center th-group th-kw">
                        {t("analytics.perf.groupKeyword")}
                      </th>
                      <th colSpan={6} className="th-center th-group th-sem">
                        {t("analytics.perf.groupSemantic")}
                      </th>
                      <th rowSpan={2} className="th-center th-narrow">{t("analytics.perf.delta")}</th>
                    </tr>
                    <tr>
                      {["P", "R", "F1", "MAP", "NDCG", "MRR", "P", "R", "F1", "MAP", "NDCG", "MRR"].map((h, i) => (
                        <th key={i} className="th-center th-metric">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evalData.rows.map((row) => {
                      const delta = row.semantic.f1 - row.keyword.f1;
                      const pos = delta >= 0;
                      return (
                        <tr key={row.mode}>
                          <td className="td-mode">{tLabel(`analytics.modes.${row.mode}`, row.mode)}</td>
                          <td className="td-center td-sub">{row.queries_tested}</td>
                          <MetricCell v={row.keyword.precision} />
                          <MetricCell v={row.keyword.recall} />
                          <MetricCell v={row.keyword.f1} bold />
                          <MetricCell v={row.keyword.map} />
                          <MetricCell v={row.keyword.ndcg} />
                          <MetricCell v={row.keyword.mrr} />
                          <MetricCell v={row.semantic.precision} />
                          <MetricCell v={row.semantic.recall} />
                          <MetricCell v={row.semantic.f1} bold />
                          <MetricCell v={row.semantic.map} />
                          <MetricCell v={row.semantic.ndcg} />
                          <MetricCell v={row.semantic.mrr} />
                          <td className={`td-delta ${pos ? "pos" : "neg"}`} dir="ltr">
                            {pos ? "+" : ""}
                            {delta.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="methodology-note">
                {t("analytics.perf.methodologyLabel") && (
                  <span className="methodology-label">{t("analytics.perf.methodologyLabel")} </span>
                )}
                {/* Methodology text comes from the evaluation API and is shown as-is (English). */}
                <span lang="en" dir="ltr">{evalData.methodology}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;

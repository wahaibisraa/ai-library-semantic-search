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

const PIE_COLORS = ["#1f2f52", "#7a2e3a", "#b8862b", "#2f6b4f"];

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

// Renders a single P / R / F1 cell: coloured number + mini progress bar
function MetricCell({ v, bold }) {
  const color =
    v >= 0.6 ? "#2f6b4f" : v >= 0.35 ? "#93651a" : "#a23b32";
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [evalData, setEvalData] = useState(null);
  const [evalLoading, setEvalLoading] = useState(true);
  const [evalError, setEvalError] = useState(null);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/analytics")
      .then((res) => setData(res.data))
      .catch(() =>
        setError("Failed to load analytics. Make sure Flask is running.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/evaluate")
      .then((res) => setEvalData(res.data))
      .catch(() => setEvalError("Failed to load evaluation metrics."))
      .finally(() => setEvalLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="analytics-state">
        <Loader2 className="spin" size={36} />
        <p>Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-state error">
        <AlertCircle size={36} />
        <p>{error}</p>
      </div>
    );
  }

  const totalSearches = data.engagement_trends.reduce(
    (s, r) => s + r.searches,
    0
  );
  const totalBorrows = data.engagement_trends.reduce(
    (s, r) => s + r.borrows,
    0
  );

  const f1ChartData = evalData
    ? evalData.rows.map((r) => ({
        mode: r.mode,
        Keyword: r.keyword.f1,
        Semantic: r.semantic.f1,
      }))
    : [];

  return (
    <div className="analytics">
      <div className="analytics-header">
        <BarChart2 size={30} />
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Library usage insights derived from student activity data</p>
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Total Searches" value={totalSearches} sub="across all students" />
        <StatCard label="Total Borrows" value={totalBorrows} sub="across all students" />
        <StatCard
          label="Unique Topics"
          value={data.top_searches.length}
          sub="in top results"
        />
        <StatCard
          label="Modes Detected"
          value={data.mode_distribution.length}
          sub="query patterns"
        />
      </div>

      <div className="charts-grid">
        {/* ── Top Searched Topics ── */}
        <div className="chart-card span-2">
          <div className="chart-header">
            <h2>Top Searched Topics</h2>
            <p>Most frequent search queries from all students</p>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={data.top_searches}
              margin={{ top: 8, right: 16, left: 0, bottom: 64 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4ddcf" vertical={false} />
              <XAxis
                dataKey="topic"
                angle={-32}
                textAnchor="end"
                tick={{ fontSize: 12, fill: "#5f6470" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#5f6470" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4ddcf",
                  fontSize: 13,
                  boxShadow: "0 8px 24px rgba(20,33,61,0.10)",
                }}
                cursor={{ fill: "#f2f4f8" }}
                formatter={(v) => [v, "Searches"]}
              />
              <Bar dataKey="count" fill="#1f2f52" radius={[6, 6, 0, 0]} name="Searches" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Mode Distribution ── */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Search Mode Distribution</h2>
            <p>How students use each query mode</p>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={data.mode_distribution}
                dataKey="value"
                nameKey="mode"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={48}
                paddingAngle={3}
              >
                {data.mode_distribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4ddcf",
                  fontSize: 13,
                  boxShadow: "0 8px 24px rgba(20,33,61,0.10)",
                }}
                formatter={(v, name) => [v, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {data.mode_distribution.map((item, i) => (
              <span key={item.mode} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {item.mode}
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* ── Most Recommended Books ── */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Most Recommended Books</h2>
            <p>Titles appearing most across student recommendations</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.top_books}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e4ddcf"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#5f6470" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="short_title"
                width={118}
                tick={{ fontSize: 11, fill: "#5f6470" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4ddcf",
                  fontSize: 13,
                  boxShadow: "0 8px 24px rgba(20,33,61,0.10)",
                }}
                formatter={(v) => [v, "Recommendations"]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.title ?? ""
                }
              />
              <Bar
                dataKey="count"
                fill="#7a2e3a"
                radius={[0, 6, 6, 0]}
                name="Recommendations"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Student Engagement Trends ── */}
        <div className="chart-card span-2">
          <div className="chart-header">
            <h2>Student Engagement Trends</h2>
            <p>Monthly searches and borrows across the academic period</p>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart
              data={data.engagement_trends}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradSearch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1f2f52" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#1f2f52" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBorrow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7a2e3a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#7a2e3a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4ddcf" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 13, fill: "#5f6470" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#5f6470" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4ddcf",
                  fontSize: 13,
                  boxShadow: "0 8px 24px rgba(20,33,61,0.10)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 13, paddingTop: 14 }}
                iconType="circle"
                iconSize={10}
              />
              <Area
                type="monotone"
                dataKey="searches"
                stroke="#1f2f52"
                strokeWidth={2.5}
                fill="url(#gradSearch)"
                name="Searches"
                dot={{ r: 4, fill: "#1f2f52", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="borrows"
                stroke="#7a2e3a"
                strokeWidth={2.5}
                fill="url(#gradBorrow)"
                name="Borrows"
                dot={{ r: 4, fill: "#7a2e3a", strokeWidth: 0 }}
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
          <h2>Search Performance: Keyword vs Semantic</h2>
          <p>
            Precision, Recall, F1, MAP, NDCG, and MRR at K&#8202;=&#8202;10, evaluated on fixed test queries.
            Ground truth: books whose library subject tags match the query topic.
          </p>
        </div>

        {evalLoading ? (
          <div className="analytics-state" style={{ minHeight: "160px" }}>
            <Loader2 className="spin" size={28} />
            <p>Computing evaluation metrics…</p>
          </div>
        ) : evalError ? (
          <div className="analytics-state error" style={{ minHeight: "120px" }}>
            <AlertCircle size={28} />
            <p>{evalError}</p>
          </div>
        ) : (
          <>
            {/* F1 grouped bar chart */}
            <div className="chart-card perf-chart">
              <div className="chart-header">
                <h3>F1 Score by Mode</h3>
                <p>Higher is better — semantic (navy) vs keyword baseline (grey)</p>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={f1ChartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                  barCategoryGap="32%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ddcf" vertical={false} />
                  <XAxis
                    dataKey="mode"
                    tick={{ fontSize: 13, fill: "#5f6470" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fontSize: 12, fill: "#5f6470" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e4ddcf",
                      fontSize: 13,
                      boxShadow: "0 8px 24px rgba(20,33,61,0.10)",
                    }}
                    formatter={(v, name) => [v.toFixed(3), name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
                    iconType="circle"
                    iconSize={10}
                  />
                  <Bar dataKey="Keyword" fill="#b3ad9f" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Semantic" fill="#1f2f52" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Full P / R / F1 detail table */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Full Metrics Table</h3>
                <p>
                  P · R · F1 · MAP · NDCG · MRR at K&#8202;=&#8202;{evalData.k} per mode — green ≥ 0.6, amber ≥ 0.35, red &lt; 0.35
                </p>
              </div>
              <div className="table-scroll">
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="th-mode">Mode</th>
                      <th rowSpan={2} className="th-center th-narrow">Queries</th>
                      <th colSpan={6} className="th-center th-group th-kw">
                        Keyword Search (Baseline)
                      </th>
                      <th colSpan={6} className="th-center th-group th-sem">
                        Semantic Search
                      </th>
                      <th rowSpan={2} className="th-center th-narrow">&#916;F1</th>
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
                          <td className="td-mode">{row.mode}</td>
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
                          <td className={`td-delta ${pos ? "pos" : "neg"}`}>
                            {pos ? "+" : ""}
                            {delta.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="methodology-note">{evalData.methodology}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;

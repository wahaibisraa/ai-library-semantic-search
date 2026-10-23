import { Link } from "react-router-dom";
import { useI18n } from "./i18n/context.js";
import nextlibLogoTransparent from "./assets/nextlib-logo-transparent.png";
import researchPaperFirstPage from "./assets/research-paper-first-page.png";

// Survey figures are research data, so they stay in code; the labels come from the translation files.
// Each row is [responses, percent]; row order matches experience.survey.charts.<name>.labels.
const surveyCharts = {
  frustrations: { max: 302, multi: true, rows: [[302, "45.3%"], [276, "41.4%"], [197, "29.6%"], [194, "29.1%"]] },
  discovery: { max: 392, multi: true, rows: [[392, "58.9%"], [303, "45.5%"], [159, "23.9%"], [112, "16.8%"]] },
  behavior: { max: 263, rows: [[263, "39.5%"], [205, "30.8%"], [109, "16.4%"], [89, "13.4%"]] },
  intent: { max: 238, rows: [[238, "35.7%"], [193, "29.0%"], [159, "23.9%"], [76, "11.4%"]] },
};

const surveyStats = ["666", "70.3%", "88.6%"];

function Experience() {
  const { t } = useI18n();
  const interviewColumns = t("experience.evidence.columns");
  const interviewRows = t("experience.evidence.rows");
  const problemPoints = t("experience.problem.points");

  return (
    <div className="story">
      <section className="story-hero">
        <div className="story-hero-copy">
          <span className="eyebrow">{t("experience.hero.eyebrow")}</span>
          <h1>{t("experience.hero.title")}</h1>
          <p className="story-lede">{t("experience.hero.lede")}</p>
        </div>
        <div className="story-hero-mark"><img src={nextlibLogoTransparent} alt={t("experience.hero.logoAlt")} /></div>
      </section>

      <section className="problem-section" id="problem">
        <div className="section-heading compact-heading">
          <span className="eyebrow">{t("experience.problem.eyebrow")}</span>
          <h2>{t("experience.problem.title")}</h2>
          <p>{t("experience.problem.body")}</p>
        </div>
        <div className="problem-points">
          {problemPoints.map((point, i) => (
            <div key={i}>
              <strong>{String(i + 1).padStart(2, "0")}</strong>
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="evidence-section" id="evidence">
        <div className="section-heading">
          <span className="eyebrow">{t("experience.evidence.eyebrow")}</span>
          <h2>{t("experience.evidence.title")}</h2>
          <p>{t("experience.evidence.body")}</p>
        </div>
        <div className="interview-table-wrap">
          <table className="interview-table">
            <thead>
              <tr>{interviewColumns.map((col) => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {interviewRows.map((row) => (
                <tr key={row[0]}>{row.map((cell, i) => <td key={`${row[0]}-${i}`}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-note">{t("experience.evidence.note")}</p>
      </section>

      <section className="survey-section" id="survey">
        <div className="section-heading">
          <span className="eyebrow">{t("experience.survey.eyebrow")}</span>
          <h2>{t("experience.survey.title")}</h2>
          <p>{t("experience.survey.body")}</p>
        </div>
        <div className="stat-strip">
          {surveyStats.map((value, i) => (
            <div key={value}><strong>{value}</strong><span>{t("experience.survey.stats")[i]}</span></div>
          ))}
        </div>
        <div className="chart-grid">
          {Object.entries(surveyCharts).map(([name, chart]) => {
            const labels = t(`experience.survey.charts.${name}.labels`);
            return (
              <SurveyChart
                key={name}
                title={t(`experience.survey.charts.${name}.title`)}
                note={chart.multi ? t("experience.survey.selectAll") : undefined}
                data={chart.rows.map(([value, percent], i) => [labels[i], value, percent])}
                max={chart.max}
              />
            );
          })}
        </div>
      </section>

      <section className="research-section" id="research">
        <div className="research-copy">
          <span className="eyebrow">{t("experience.research.eyebrow")}</span>
          <h2>{t("experience.research.title")}</h2>
          <p>{t("experience.research.body")}</p>
          <div className="research-meta">
            {t("experience.research.meta").map((m) => <span key={m}>{m}</span>)}
          </div>
        </div>
        <div className="paper-frame"><img src={researchPaperFirstPage} alt={t("experience.research.paperAlt")} /></div>
        <div className="presentation-placeholder">
          <div className="placeholder-icon">+</div>
          <strong>{t("experience.research.placeholderTitle")}</strong>
          <span>{t("experience.research.placeholderBody")}</span>
        </div>
      </section>

      <section className="demo-slide">
        <span className="eyebrow">{t("experience.demo.eyebrow")}</span>
        <h2>{t("experience.demo.title")}</h2>
        <p>{t("experience.demo.body")}</p>
        <Link className="demo-slide-link" to="/">
          {t("experience.demo.cta")} <span className="demo-slide-arrow" aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}

function SurveyChart({ title, note, data, max }) {
  const { t } = useI18n();
  return (
    <div className="survey-chart">
      <div className="chart-title"><h3>{title}</h3>{note && <span>{note}</span>}</div>
      <div className="bars">
        {data.map(([label, value, percent]) => (
          <div className="bar-row" key={label}>
            <div className="bar-label"><span>{label}</span><b>{percent}</b></div>
            <div className="bar-track"><span style={{ width: `${(value / max) * 100}%` }} /></div>
            <small>{t("experience.survey.responses", { count: value })}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Experience;

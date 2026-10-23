import { useMemo } from "react";
import { useTheme } from "./context.js";

// Recharts takes colours as SVG attributes, which can't follow CSS variables reliably,
// so the chart palette is read from the design tokens in index.css whenever the theme changes.
const TOKENS = {
  series1: "--chart-1",
  series2: "--chart-2",
  series3: "--chart-3",
  series4: "--chart-4",
  baseline: "--chart-baseline",
  grid: "--chart-grid",
  axis: "--chart-axis",
  cursor: "--chart-cursor",
  surface: "--surface",
  border: "--border",
  text: "--text",
  success: "--success",
  warning: "--warning",
  danger: "--danger",
};

export default function useChartColors() {
  const { theme } = useTheme();

  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const colors = { theme };
    for (const [name, token] of Object.entries(TOKENS)) {
      colors[name] = styles.getPropertyValue(token).trim();
    }
    colors.series = [colors.series1, colors.series2, colors.series3, colors.series4];
    return colors;
  }, [theme]);
}

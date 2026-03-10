import Plot from "react-plotly.js";
import { Paper, SimpleGrid, Text } from "@mantine/core";
import type { Stats } from "../types";

interface ChartsProps {
  stats: Stats | null;
}

export function Charts({ stats }: ChartsProps) {
  if (!stats) return null;

  const years = Object.keys(stats.byYear);
  const yearCounts = Object.values(stats.byYear);

  const typeLabels = Object.keys(stats.byType);
  const typeValues = Object.values(stats.byType);

  const statusEntries = Object.entries(stats.byStatus)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topInv = stats.topInventors.slice(0, 15);

  const plotLayout = {
    margin: { t: 30, r: 20, b: 50, l: 50 },
    height: 300,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#c9d1d9", size: 11 },
    xaxis: { gridcolor: "#2a2e35" },
    yaxis: { gridcolor: "#2a2e35" },
  };

  const plotConfig = { displayModeBar: false, responsive: true } as const;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="xs">
          Patents Filed by Year
        </Text>
        <Plot
          data={[
            {
              x: years,
              y: yearCounts,
              type: "bar",
              marker: { color: "#339af0" },
            },
          ]}
          layout={{ ...plotLayout }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: 300 }}
        />
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="xs">
          Application Types
        </Text>
        <Plot
          data={[
            {
              labels: typeLabels,
              values: typeValues,
              type: "pie",
              hole: 0.45,
              marker: {
                colors: ["#339af0", "#51cf66", "#fcc419", "#ff6b6b"],
              },
              textinfo: "label+percent",
              textfont: { color: "#fff" },
            },
          ]}
          layout={{
            ...plotLayout,
            showlegend: false,
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: 300 }}
        />
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="xs">
          Top Statuses
        </Text>
        <Plot
          data={[
            {
              y: statusEntries.map(([s]) => s),
              x: statusEntries.map(([, c]) => c),
              type: "bar",
              orientation: "h",
              marker: { color: "#51cf66" },
            },
          ]}
          layout={{
            ...plotLayout,
            yaxis: { ...plotLayout.yaxis, automargin: true },
            margin: { ...plotLayout.margin, l: 200 },
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: 300 }}
        />
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="xs">
          Top 15 Inventors
        </Text>
        <Plot
          data={[
            {
              y: topInv.map((i) => i.name).reverse(),
              x: topInv.map((i) => i.count).reverse(),
              type: "bar",
              orientation: "h",
              marker: { color: "#fcc419" },
            },
          ]}
          layout={{
            ...plotLayout,
            yaxis: { ...plotLayout.yaxis, automargin: true },
            margin: { ...plotLayout.margin, l: 180 },
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: 300 }}
        />
      </Paper>
    </SimpleGrid>
  );
}

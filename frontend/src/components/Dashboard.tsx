import { useMemo } from "react";
import Plot from "react-plotly.js";
import {
  SimpleGrid,
  Paper,
  Text,
  Group,
  Stack,
  RingProgress,
  Title,
  Divider,
  Table,
  Badge,
} from "@mantine/core";
import type { Patent } from "../types";

const COLORS = {
  blue: "#339af0",
  green: "#51cf66",
  yellow: "#fcc419",
  red: "#ff6b6b",
  purple: "#cc5de8",
  cyan: "#22b8cf",
  orange: "#ff922b",
  pink: "#f06595",
};

const TYPE_COLORS: Record<string, string> = {
  Utility: COLORS.blue,
  PCT: COLORS.green,
  Provisional: COLORS.yellow,
  "Re-Issue": COLORS.purple,
};

const plotLayout: Partial<Plotly.Layout> = {
  margin: { t: 10, r: 20, b: 50, l: 50 },
  height: 320,
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#c9d1d9", size: 11 },
  xaxis: { gridcolor: "#2a2e35" },
  yaxis: { gridcolor: "#2a2e35" },
  legend: { font: { color: "#c9d1d9", size: 10 } },
  hoverlabel: { font: { size: 12 } },
};

const plotConfig: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

function counter<T>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const item of items) {
    m.set(item, (m.get(item) ?? 0) + 1);
  }
  return m;
}

function sortedEntries(
  map: Map<string, number>,
  desc = true
): [string, number][] {
  return [...map.entries()].sort((a, b) =>
    desc ? b[1] - a[1] : a[0].localeCompare(b[0])
  );
}

function monthsDiff(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

// Maintenance fee windows (years after grant)
const MAINT_FEES = [
  { label: "1st (3.5 yr)", years: 3.5, windowMonths: 6 },
  { label: "2nd (7.5 yr)", years: 7.5, windowMonths: 6 },
  { label: "3rd (11.5 yr)", years: 11.5, windowMonths: 6 },
];

interface MaintFeeEntry {
  patent: Patent;
  feeLabel: string;
  dueDate: Date;
  monthsUntilDue: number;
  window: "overdue" | "due_now" | "upcoming" | "future";
}

interface DashboardProps {
  patents: Patent[];
}

export function Dashboard({ patents }: DashboardProps) {
  const stats = useMemo(() => {
    const total = patents.length;
    const now = new Date();

    // Status categories
    const granted = patents.filter((p) => p.status === "Patented Case");
    const abandoned = patents.filter((p) =>
      p.status.toLowerCase().includes("abandoned")
    );
    const expiredMaint = patents.filter((p) =>
      p.status.includes("NonPayment of Maintenance Fees")
    );
    const expiredOther = patents.filter(
      (p) =>
        p.status.toLowerCase().includes("expired") &&
        !p.status.includes("NonPayment of Maintenance Fees")
    );
    const isActive = (p: Patent) =>
      !p.status.toLowerCase().includes("abandon") &&
      !p.status.toLowerCase().includes("expired") &&
      p.status !== "Patented Case" &&
      p.status !== "RO PROCESSING COMPLETED-PLACED IN STORAGE";
    const pending = patents.filter(isActive);

    // Active pipeline stages
    const pipelineStages: Record<string, Patent[]> = {
      "Ready for Examination": [],
      "Office Action (Non-Final)": [],
      "Office Action (Final)": [],
      "Response Entered": [],
      "Allowed / Notice of Allowance": [],
      "On Appeal": [],
      "Other Active": [],
    };
    for (const p of pending) {
      const s = p.status;
      if (s.includes("Docketed") || s.includes("Ready for Examination"))
        pipelineStages["Ready for Examination"].push(p);
      else if (
        s.includes("Non Final Action") ||
        s.includes("Non-Final") ||
        (s.includes("Non Final") && !s.includes("Response"))
      )
        pipelineStages["Office Action (Non-Final)"].push(p);
      else if (s.includes("Final Rejection") || s.includes("Final Action"))
        pipelineStages["Office Action (Final)"].push(p);
      else if (s.includes("Response") && s.includes("Entered"))
        pipelineStages["Response Entered"].push(p);
      else if (s.includes("Allowance") || s.includes("Allowed"))
        pipelineStages["Allowed / Notice of Allowance"].push(p);
      else if (s.includes("Appeal"))
        pipelineStages["On Appeal"].push(p);
      else pipelineStages["Other Active"].push(p);
    }

    // By type
    const byType = counter(patents.map((p) => p.type));

    // By year + type
    const byYearType: Record<string, Record<string, number>> = {};
    for (const p of patents) {
      const year = p.filingDate?.slice(0, 4);
      if (!year) continue;
      if (!byYearType[year]) byYearType[year] = {};
      byYearType[year][p.type] = (byYearType[year][p.type] ?? 0) + 1;
    }
    const years = Object.keys(byYearType).sort();
    const types = ["Utility", "PCT", "Provisional", "Re-Issue"];

    // By correspondence name (law firm)
    const byFirm = counter(
      patents.map((p) => p.correspondenceAddress?.name ?? "Unknown")
    );

    // Inventors
    const inventorCounts = new Map<string, number>();
    for (const p of patents) {
      for (const inv of p.inventors) {
        inventorCounts.set(inv, (inventorCounts.get(inv) ?? 0) + 1);
      }
    }
    const avgInventorsPerPatent =
      patents.reduce((s, p) => s + p.inventorCount, 0) / total;

    // Grant rate by year (utility only)
    const utilityPatents = patents.filter((p) => p.type === "Utility");
    const filedByYear = counter(
      utilityPatents
        .filter((p) => p.filingDate)
        .map((p) => p.filingDate.slice(0, 4))
    );
    const grantedByYear = counter(
      granted
        .filter((p) => p.filingDate && p.type === "Utility")
        .map((p) => p.filingDate.slice(0, 4))
    );
    const grantRateByYear: [string, number][] = [];
    for (const [year, filed] of sortedEntries(filedByYear, false)) {
      const g = grantedByYear.get(year) ?? 0;
      if (filed >= 5) {
        grantRateByYear.push([year, Math.round((g / filed) * 100)]);
      }
    }

    // Time to grant (months)
    const timeToGrant: number[] = [];
    for (const p of granted) {
      if (p.filingDate && p.grantDate) {
        const months = monthsDiff(p.filingDate, p.grantDate);
        if (months > 0 && months < 200) timeToGrant.push(Math.round(months));
      }
    }
    const avgTimeToGrant = timeToGrant.length
      ? (timeToGrant.reduce((a, b) => a + b, 0) / timeToGrant.length).toFixed(
          1
        )
      : "N/A";

    // Maintenance fee analysis for granted patents
    const maintFees: MaintFeeEntry[] = [];
    for (const p of granted) {
      if (!p.grantDate) continue;
      const grantDate = new Date(p.grantDate);
      for (const fee of MAINT_FEES) {
        const dueDate = new Date(grantDate);
        dueDate.setFullYear(dueDate.getFullYear() + Math.floor(fee.years));
        dueDate.setMonth(dueDate.getMonth() + (fee.years % 1) * 12);
        const monthsUntilDue =
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        let window: MaintFeeEntry["window"];
        if (monthsUntilDue < -fee.windowMonths) window = "overdue";
        else if (monthsUntilDue < 0) window = "due_now";
        else if (monthsUntilDue < 12) window = "upcoming";
        else window = "future";

        maintFees.push({
          patent: p,
          feeLabel: fee.label,
          dueDate,
          monthsUntilDue,
          window,
        });
      }
    }

    const maintDueNow = maintFees.filter((m) => m.window === "due_now");
    const maintUpcoming = maintFees.filter((m) => m.window === "upcoming");
    const maintOverdue = maintFees.filter((m) => m.window === "overdue");

    // Maintenance fee timeline by year
    const maintByYear: Record<string, number> = {};
    for (const m of maintFees) {
      if (m.window === "upcoming" || m.window === "due_now") {
        const yr = m.dueDate.getFullYear().toString();
        maintByYear[yr] = (maintByYear[yr] ?? 0) + 1;
      }
    }

    // CPC classifications
    const cpcCounts = new Map<string, number>();
    for (const p of patents) {
      for (const cpc of p.cpcClassifications) {
        const group = cpc.split(/\s+/)[0];
        cpcCounts.set(group, (cpcCounts.get(group) ?? 0) + 1);
      }
    }

    // Examiners
    const examinerCounts = counter(
      patents.filter((p) => p.examiner).map((p) => p.examiner)
    );

    // Art units
    const artUnitCounts = counter(
      patents.filter((p) => p.groupArtUnit).map((p) => p.groupArtUnit)
    );

    // Inventor count distribution
    const invCountDist = counter(patents.map((p) => p.inventorCount));

    // Entity status
    const entityCounts = counter(
      patents.map((p) => p.entityStatus || "Unknown")
    );

    // Filing activity last 12 months vs prior 12
    const oneYearAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate()
    );
    const twoYearsAgo = new Date(
      now.getFullYear() - 2,
      now.getMonth(),
      now.getDate()
    );
    const lastYear = patents.filter(
      (p) => p.filingDate && new Date(p.filingDate) >= oneYearAgo
    ).length;
    const priorYear = patents.filter(
      (p) =>
        p.filingDate &&
        new Date(p.filingDate) >= twoYearsAgo &&
        new Date(p.filingDate) < oneYearAgo
    ).length;

    return {
      total,
      granted: granted.length,
      abandoned: abandoned.length,
      expiredMaint: expiredMaint.length,
      expiredOther: expiredOther.length,
      pending: pending.length,
      pipelineStages,
      grantRate:
        utilityPatents.length > 0
          ? Math.round((granted.length / utilityPatents.length) * 100)
          : 0,
      byType,
      byYearType,
      years,
      types,
      byFirm,
      inventorCounts,
      uniqueInventors: inventorCounts.size,
      avgInventorsPerPatent: avgInventorsPerPatent.toFixed(1),
      grantRateByYear,
      timeToGrant,
      avgTimeToGrant,
      cpcCounts,
      examinerCounts,
      artUnitCounts,
      invCountDist,
      entityCounts,
      lastYear,
      priorYear,
      uniqueFirms: byFirm.size,
      maintDueNow,
      maintUpcoming,
      maintOverdue,
      maintByYear,
    };
  }, [patents]);

  if (!patents.length) return null;

  const topFirms = sortedEntries(stats.byFirm).slice(0, 10);
  const topInventors = sortedEntries(stats.inventorCounts).slice(0, 20);
  const topCpc = sortedEntries(stats.cpcCounts).slice(0, 15);
  const topExaminers = sortedEntries(stats.examinerCounts).slice(0, 15);
  const topArtUnits = sortedEntries(stats.artUnitCounts).slice(0, 12);

  return (
    <Stack gap="lg">
      {/* ===== SECTION: Portfolio Overview ===== */}
      <Title order={4} c="dimmed">
        Portfolio Overview
      </Title>

      <SimpleGrid cols={{ base: 2, sm: 4, lg: 8 }}>
        <KpiCard label="Total Applications" value={stats.total.toLocaleString()} />
        <KpiCard label="Granted" value={stats.granted.toLocaleString()} color={COLORS.green} />
        <KpiCard label="Active / Pending" value={stats.pending.toLocaleString()} color={COLORS.blue} />
        <KpiCard label="Abandoned" value={stats.abandoned.toLocaleString()} color={COLORS.red} />
        <KpiCard label="Expired (Maint Fees)" value={stats.expiredMaint.toLocaleString()} color={COLORS.orange} />
        <KpiCard label="Grant Rate (Utility)" value={`${stats.grantRate}%`} color={COLORS.cyan} />
        <KpiCard label="Unique Inventors" value={stats.uniqueInventors.toLocaleString()} color={COLORS.purple} />
        <KpiCard label="Avg Time to Grant" value={`${stats.avgTimeToGrant} mo`} color={COLORS.yellow} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Filings Last 12 Months
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {stats.lastYear}
          </Text>
          <Text
            size="xs"
            c={stats.lastYear >= stats.priorYear ? "green" : "red"}
            mt={2}
          >
            {stats.priorYear > 0
              ? `${stats.lastYear >= stats.priorYear ? "+" : ""}${Math.round(((stats.lastYear - stats.priorYear) / stats.priorYear) * 100)}% vs prior year (${stats.priorYear})`
              : "N/A"}
          </Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Avg Inventors / Patent
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {stats.avgInventorsPerPatent}
          </Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Portfolio Health
          </Text>
          <Group mt={4} gap="xs">
            <RingProgress
              size={60}
              thickness={6}
              roundCaps
              sections={[
                { value: (stats.granted / stats.total) * 100, color: COLORS.green },
                { value: (stats.pending / stats.total) * 100, color: COLORS.blue },
                { value: (stats.abandoned / stats.total) * 100, color: COLORS.red },
                { value: ((stats.expiredMaint + stats.expiredOther) / stats.total) * 100, color: COLORS.yellow },
              ]}
            />
            <Stack gap={2}>
              <Text size="xs"><span style={{ color: COLORS.green }}>&#9679;</span> Granted {Math.round((stats.granted / stats.total) * 100)}%</Text>
              <Text size="xs"><span style={{ color: COLORS.blue }}>&#9679;</span> Pending {Math.round((stats.pending / stats.total) * 100)}%</Text>
              <Text size="xs"><span style={{ color: COLORS.red }}>&#9679;</span> Abandoned {Math.round((stats.abandoned / stats.total) * 100)}%</Text>
              <Text size="xs"><span style={{ color: COLORS.yellow }}>&#9679;</span> Expired {Math.round(((stats.expiredMaint + stats.expiredOther) / stats.total) * 100)}%</Text>
            </Stack>
          </Group>
        </Paper>
      </SimpleGrid>

      <Divider />

      {/* ===== SECTION: Active Pipeline ===== */}
      <Title order={4} c="dimmed">
        Active Application Pipeline
      </Title>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }}>
        {Object.entries(stats.pipelineStages)
          .filter(([, apps]) => apps.length > 0)
          .map(([stage, apps]) => (
            <Paper key={stage} p="md" radius="md" withBorder>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                {stage}
              </Text>
              <Text size="xl" fw={700} mt={4}>
                {apps.length}
              </Text>
            </Paper>
          ))}
      </SimpleGrid>

      <ChartCard title="Examination Pipeline">
        <Plot
          data={(() => {
            const stages = Object.entries(stats.pipelineStages).filter(
              ([, a]) => a.length > 0
            );
            return [
              {
                type: "funnel" as const,
                y: stages.map(([s]) => s),
                x: stages.map(([, a]) => a.length),
                textinfo: "value+percent initial" as const,
                marker: {
                  color: [
                    COLORS.blue,
                    COLORS.orange,
                    COLORS.red,
                    COLORS.cyan,
                    COLORS.green,
                    COLORS.purple,
                    COLORS.pink,
                  ],
                },
              },
            ];
          })()}
          layout={{
            ...plotLayout,
            margin: { t: 10, r: 20, b: 20, l: 10 },
            height: 350,
            funnelmode: "stack",
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: 350 }}
        />
      </ChartCard>

      <Divider />

      {/* ===== SECTION: Maintenance Fees ===== */}
      <Title order={4} c="dimmed">
        Maintenance Fee Tracker (Granted Patents)
      </Title>
      <Text size="xs" c="dimmed" mt={-10}>
        Calculated from grant dates. Fees due at 3.5, 7.5, and 11.5 years after grant.
        This is an estimate — verify with USPTO PAIR for actual payment status.
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Paper p="md" radius="md" withBorder style={{ borderColor: COLORS.green }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Active Granted Patents
          </Text>
          <Text size="xl" fw={700} mt={4} c={COLORS.green}>
            {stats.granted}
          </Text>
        </Paper>
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ borderColor: stats.maintDueNow.length > 0 ? COLORS.red : undefined }}
        >
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Fees In Window Now
          </Text>
          <Text
            size="xl"
            fw={700}
            mt={4}
            c={stats.maintDueNow.length > 0 ? COLORS.red : COLORS.green}
          >
            {stats.maintDueNow.length}
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            Currently in payment window
          </Text>
        </Paper>
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ borderColor: stats.maintUpcoming.length > 0 ? COLORS.orange : undefined }}
        >
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Fees Due Next 12 Months
          </Text>
          <Text size="xl" fw={700} mt={4} c={COLORS.orange}>
            {stats.maintUpcoming.length}
          </Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Expired (Non-Payment)
          </Text>
          <Text size="xl" fw={700} mt={4} c={COLORS.red}>
            {stats.expiredMaint}
          </Text>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* Maintenance fee timeline */}
        <ChartCard title="Upcoming Maintenance Fees by Year">
          <Plot
            data={[
              {
                x: Object.keys(stats.maintByYear).sort(),
                y: Object.keys(stats.maintByYear)
                  .sort()
                  .map((y) => stats.maintByYear[y]),
                type: "bar",
                marker: { color: COLORS.orange },
              },
            ]}
            layout={{
              ...plotLayout,
              height: 300,
              yaxis: { ...plotLayout.yaxis, title: "Fee Events" },
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 300 }}
          />
        </ChartCard>

        {/* Fees due soon table */}
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" fw={600} mb="xs">
            Next Maintenance Fees Due (Soonest First)
          </Text>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <Table striped highlightOnHover fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Patent #</Table.Th>
                  <Table.Th>Fee</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...stats.maintDueNow, ...stats.maintUpcoming]
                  .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                  .slice(0, 20)
                  .map((m, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{m.patent.patentNumber ?? m.patent.applicationNumber}</Table.Td>
                      <Table.Td>{m.feeLabel}</Table.Td>
                      <Table.Td>{m.dueDate.toISOString().slice(0, 10)}</Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          color={m.window === "due_now" ? "red" : "yellow"}
                        >
                          {m.window === "due_now" ? "DUE NOW" : "UPCOMING"}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </div>
        </Paper>
      </SimpleGrid>

      <Divider />

      {/* ===== SECTION: Filing Trends & Strategy ===== */}
      <Title order={4} c="dimmed">
        Filing Trends & Strategy
      </Title>

      <ChartCard title="Filing Trends by Year & Type">
        <Plot
          data={stats.types.map((type) => ({
            x: stats.years,
            y: stats.years.map((y) => stats.byYearType[y]?.[type] ?? 0),
            type: "bar" as const,
            name: type,
            marker: { color: TYPE_COLORS[type] ?? COLORS.cyan },
          }))}
          layout={{
            ...plotLayout,
            barmode: "stack",
            legend: { ...plotLayout.legend, orientation: "h", y: 1.12 },
            height: 350,
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: 350 }}
        />
      </ChartCard>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <ChartCard title="Filings by Law Firm / Correspondent">
          <Plot
            data={[
              {
                y: topFirms.map(([n]) => truncate(n, 35)).reverse(),
                x: topFirms.map(([, c]) => c).reverse(),
                type: "bar",
                orientation: "h",
                marker: { color: COLORS.blue },
                hovertext: topFirms
                  .map(([n, c]) => `${n}: ${c}`)
                  .reverse(),
                hoverinfo: "text" as const,
              },
            ]}
            layout={{
              ...plotLayout,
              yaxis: { ...plotLayout.yaxis, automargin: true },
              margin: { ...plotLayout.margin, l: 220 },
              height: 380,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 380 }}
          />
        </ChartCard>

        <ChartCard title="Application Type Distribution">
          <Plot
            data={[
              {
                labels: [...stats.byType.keys()],
                values: [...stats.byType.values()],
                type: "pie",
                hole: 0.5,
                marker: {
                  colors: [...stats.byType.keys()].map(
                    (t) => TYPE_COLORS[t] ?? COLORS.cyan
                  ),
                },
                textinfo: "label+value+percent",
                textfont: { color: "#fff", size: 12 },
                hoverinfo: "label+value+percent" as const,
              },
            ]}
            layout={{
              ...plotLayout,
              showlegend: false,
              height: 380,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 380 }}
          />
        </ChartCard>
      </SimpleGrid>

      <Divider />

      {/* ===== SECTION: Grant Analysis ===== */}
      <Title order={4} c="dimmed">
        Grant Analysis
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <ChartCard title="Grant Rate by Filing Year (Utility Only)">
          <Plot
            data={[
              {
                x: stats.grantRateByYear.map(([y]) => y),
                y: stats.grantRateByYear.map(([, r]) => r),
                type: "scatter",
                mode: "lines+markers",
                line: { color: COLORS.green, width: 2 },
                marker: { size: 6 },
                hovertemplate: "%{x}: %{y}%<extra></extra>",
              },
            ]}
            layout={{
              ...plotLayout,
              yaxis: {
                ...plotLayout.yaxis,
                title: "Grant Rate %",
                range: [0, 100],
              },
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 320 }}
          />
        </ChartCard>

        <ChartCard
          title={`Time to Grant Distribution (avg ${stats.avgTimeToGrant} months)`}
        >
          <Plot
            data={[
              {
                x: stats.timeToGrant,
                type: "histogram",
                marker: { color: COLORS.cyan },
                xbins: { size: 6 },
                hovertemplate:
                  "%{x} months: %{y} patents<extra></extra>",
              },
            ]}
            layout={{
              ...plotLayout,
              xaxis: {
                ...plotLayout.xaxis,
                title: "Months from Filing to Grant",
              },
              yaxis: {
                ...plotLayout.yaxis,
                title: "Number of Patents",
              },
              bargap: 0.05,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 320 }}
          />
        </ChartCard>
      </SimpleGrid>

      <Divider />

      {/* ===== SECTION: Technology & Examiners ===== */}
      <Title order={4} c="dimmed">
        Technology & Examination
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <ChartCard title="Top Technology Areas (CPC Groups)">
          <Plot
            data={[
              {
                y: topCpc.map(([n]) => n).reverse(),
                x: topCpc.map(([, c]) => c).reverse(),
                type: "bar",
                orientation: "h",
                marker: { color: COLORS.purple },
              },
            ]}
            layout={{
              ...plotLayout,
              yaxis: { ...plotLayout.yaxis, automargin: true },
              margin: { ...plotLayout.margin, l: 80 },
              height: 420,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 420 }}
          />
        </ChartCard>

        <ChartCard title="Top Art Units">
          <Plot
            data={[
              {
                y: topArtUnits.map(([n]) => n).reverse(),
                x: topArtUnits.map(([, c]) => c).reverse(),
                type: "bar",
                orientation: "h",
                marker: { color: COLORS.pink },
              },
            ]}
            layout={{
              ...plotLayout,
              yaxis: { ...plotLayout.yaxis, automargin: true },
              margin: { ...plotLayout.margin, l: 80 },
              height: 420,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 420 }}
          />
        </ChartCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <ChartCard title="Top 15 Patent Examiners">
          <Plot
            data={[
              {
                y: topExaminers.map(([n]) => truncate(n, 25)).reverse(),
                x: topExaminers.map(([, c]) => c).reverse(),
                type: "bar",
                orientation: "h",
                marker: { color: COLORS.orange },
              },
            ]}
            layout={{
              ...plotLayout,
              yaxis: { ...plotLayout.yaxis, automargin: true },
              margin: { ...plotLayout.margin, l: 180 },
              height: 420,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 420 }}
          />
        </ChartCard>

        <ChartCard title="Entity Status Breakdown">
          <Plot
            data={[
              {
                labels: [...stats.entityCounts.keys()],
                values: [...stats.entityCounts.values()],
                type: "pie",
                hole: 0.45,
                marker: {
                  colors: [
                    COLORS.blue,
                    COLORS.green,
                    COLORS.yellow,
                    COLORS.red,
                    COLORS.purple,
                  ],
                },
                textinfo: "label+value+percent",
                textfont: { color: "#fff", size: 11 },
              },
            ]}
            layout={{
              ...plotLayout,
              showlegend: false,
              height: 420,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 420 }}
          />
        </ChartCard>
      </SimpleGrid>

      <Divider />

      {/* ===== SECTION: Inventor Intelligence ===== */}
      <Title order={4} c="dimmed">
        Inventor Intelligence
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <ChartCard title="Top 20 Inventors by Patent Count">
          <Plot
            data={[
              {
                y: topInventors
                  .map(([n]) => truncate(n, 25))
                  .reverse(),
                x: topInventors.map(([, c]) => c).reverse(),
                type: "bar",
                orientation: "h",
                marker: { color: COLORS.yellow },
              },
            ]}
            layout={{
              ...plotLayout,
              yaxis: { ...plotLayout.yaxis, automargin: true },
              margin: { ...plotLayout.margin, l: 180 },
              height: 450,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 450 }}
          />
        </ChartCard>

        <ChartCard title="Inventors per Patent Distribution">
          <Plot
            data={[
              {
                x: [...stats.invCountDist.keys()].sort(
                  (a, b) => a - b
                ),
                y: [...stats.invCountDist.keys()]
                  .sort((a, b) => a - b)
                  .map((k) => stats.invCountDist.get(k)!),
                type: "bar",
                marker: { color: COLORS.cyan },
              },
            ]}
            layout={{
              ...plotLayout,
              xaxis: {
                ...plotLayout.xaxis,
                title: "Number of Inventors",
              },
              yaxis: {
                ...plotLayout.yaxis,
                title: "Number of Patents",
              },
              height: 450,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: 450 }}
          />
        </ChartCard>
      </SimpleGrid>
    </Stack>
  );
}

// Helper components

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700} mt={4} c={color}>
        {value}
      </Text>
    </Paper>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text size="sm" fw={600} mb="xs">
        {title}
      </Text>
      {children}
    </Paper>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

import { SimpleGrid, Paper, Text } from "@mantine/core";
import type { Stats } from "../types";

interface StatsCardsProps {
  stats: Stats | null;
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  const cards = [
    { label: "Total Patents", value: stats.totalPatents.toLocaleString() },
    { label: "Unique Inventors", value: stats.uniqueInventors.toLocaleString() },
    { label: "Granted", value: (stats.byStatus["Patented Case"] ?? 0).toLocaleString() },
    { label: "Utility", value: (stats.byType["Utility"] ?? 0).toLocaleString() },
  ];

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      {cards.map((c) => (
        <Paper key={c.label} p="md" radius="md" withBorder>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            {c.label}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {c.value}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

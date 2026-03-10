import { useEffect, useState } from "react";
import {
  AppShell,
  Title,
  Text,
  Tabs,
  LoadingOverlay,
  Group,
  Badge,
} from "@mantine/core";
import { Dashboard } from "./components/Dashboard";
import { PatentTable } from "./components/PatentTable";
import { fetchPatents } from "./api";
import type { Patent } from "./types";

export default function App() {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatents()
      .then(setPatents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Title order={3} c="red">
          Failed to load data
        </Title>
        <Text c="dimmed" mt="sm">
          Make sure the Flask backend is running on port 5001
        </Text>
        <Text size="sm" c="red" mt="xs">
          {error}
        </Text>
      </div>
    );
  }

  return (
    <AppShell header={{ height: 60 }} padding="lg">
      <AppShell.Header
        px="lg"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--mantine-color-dark-4)",
        }}
      >
        <Group>
          <Title order={3} fw={700}>
            Microchip Patent Explorer
          </Title>
          {patents.length > 0 && (
            <Badge variant="light" size="lg">
              {patents.length.toLocaleString()} patents
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          Microchip Technology Incorporated
        </Text>
      </AppShell.Header>

      <AppShell.Main pos="relative">
        <LoadingOverlay visible={loading} />

        <Tabs defaultValue="dashboard" keepMounted={false}>
          <Tabs.List mb="lg">
            <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
            <Tabs.Tab value="patents">Patents</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard">
            <Dashboard patents={patents} />
          </Tabs.Panel>

          <Tabs.Panel value="patents">
            <PatentTable patents={patents} />
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>
    </AppShell>
  );
}

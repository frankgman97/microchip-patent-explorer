import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import {
  Paper,
  TextInput,
  Group,
  Button,
  Popover,
  Checkbox,
  Stack,
  Text,
  Divider,
} from "@mantine/core";
import type { Patent } from "../types";
import type { ColDef } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const myTheme = themeQuartz.withParams({
  backgroundColor: "#1a1b1e",
  foregroundColor: "#c9d1d9",
  headerBackgroundColor: "#25262b",
  headerFontSize: 13,
  oddRowBackgroundColor: "#1e1f23",
  borderColor: "#2c2e33",
  accentColor: "#339af0",
});

// Every field available — user picks which to show
const ALL_COLUMNS: ColDef<Patent>[] = [
  {
    field: "applicationNumber",
    headerName: "App #",
    width: 130,
    pinned: "left",
  },
  {
    field: "title",
    headerName: "Title",
    flex: 2,
    minWidth: 250,
    tooltipField: "title",
  },
  {
    field: "type",
    headerName: "Type",
    width: 110,
    filter: "agSetColumnFilter",
  },
  {
    field: "status",
    headerName: "Status",
    width: 220,
    filter: "agSetColumnFilter",
    tooltipField: "status",
  },
  {
    field: "statusDate",
    headerName: "Status Date",
    width: 130,
  },
  {
    field: "filingDate",
    headerName: "Filed",
    width: 120,
    filter: "agDateColumnFilter",
    sort: "desc",
  },
  {
    field: "inventors",
    headerName: "Inventors",
    flex: 1,
    minWidth: 200,
    valueFormatter: (p) => p.value?.join(", ") ?? "",
    tooltipValueGetter: (p) => p.value?.join(", ") ?? "",
    filter: "agTextColumnFilter",
    filterValueGetter: (p) => p.data?.inventors?.join(" ") ?? "",
  },
  {
    field: "inventorCount",
    headerName: "# Inventors",
    width: 110,
    filter: "agNumberColumnFilter",
  },
  {
    field: "examiner",
    headerName: "Examiner",
    width: 200,
    filter: "agTextColumnFilter",
  },
  {
    field: "patentNumber",
    headerName: "Patent #",
    width: 130,
  },
  {
    field: "grantDate",
    headerName: "Grant Date",
    width: 120,
  },
  {
    field: "publicationNumber",
    headerName: "Publication #",
    width: 160,
  },
  {
    field: "publicationDate",
    headerName: "Publication Date",
    width: 140,
  },
  {
    field: "publicationCategory",
    headerName: "Pub Category",
    width: 220,
    filter: "agSetColumnFilter",
  },
  {
    field: "groupArtUnit",
    headerName: "Art Unit",
    width: 100,
    filter: "agSetColumnFilter",
  },
  {
    field: "docketNumber",
    headerName: "Docket #",
    width: 200,
  },
  {
    field: "confirmationNumber",
    headerName: "Confirmation #",
    width: 140,
  },
  {
    field: "entityStatus",
    headerName: "Entity Status",
    width: 180,
    filter: "agSetColumnFilter",
  },
  {
    field: "customerNumber",
    headerName: "Customer #",
    width: 130,
  },
  {
    field: "firstInventorToFile",
    headerName: "First to File",
    width: 110,
    valueFormatter: (p) => (p.value ? "Yes" : "No"),
    filter: "agSetColumnFilter",
  },
  {
    field: "cpcClassifications",
    headerName: "CPC Classifications",
    flex: 1,
    minWidth: 200,
    valueFormatter: (p) => p.value?.join(", ") ?? "",
    tooltipValueGetter: (p) => p.value?.join(", ") ?? "",
    filter: "agTextColumnFilter",
    filterValueGetter: (p) => p.data?.cpcClassifications?.join(" ") ?? "",
  },
  {
    field: "pctPublicationNumber",
    headerName: "PCT Pub #",
    width: 160,
  },
  {
    field: "pctPublicationDate",
    headerName: "PCT Pub Date",
    width: 130,
  },
  {
    field: "correspondenceAddress.name",
    headerName: "Corresp. Name",
    width: 250,
    valueGetter: (p) => p.data?.correspondenceAddress?.name ?? "",
    filter: "agTextColumnFilter",
  },
  {
    field: "correspondenceAddress.street",
    headerName: "Corresp. Street",
    width: 250,
    valueGetter: (p) => p.data?.correspondenceAddress?.street ?? "",
  },
  {
    field: "correspondenceAddress.city",
    headerName: "Corresp. City",
    width: 140,
    valueGetter: (p) => p.data?.correspondenceAddress?.city ?? "",
    filter: "agSetColumnFilter",
  },
  {
    field: "correspondenceAddress.state",
    headerName: "Corresp. State",
    width: 120,
    valueGetter: (p) => p.data?.correspondenceAddress?.state ?? "",
    filter: "agSetColumnFilter",
  },
  {
    field: "correspondenceAddress.zip",
    headerName: "Corresp. Zip",
    width: 110,
    valueGetter: (p) => p.data?.correspondenceAddress?.zip ?? "",
  },
  {
    field: "correspondenceAddress.country",
    headerName: "Corresp. Country",
    width: 130,
    valueGetter: (p) => p.data?.correspondenceAddress?.country ?? "",
    filter: "agSetColumnFilter",
  },
];

// Default visible columns
const DEFAULT_VISIBLE = new Set([
  "applicationNumber",
  "title",
  "type",
  "status",
  "filingDate",
  "inventors",
  "inventorCount",
  "examiner",
  "patentNumber",
  "grantDate",
]);

interface PatentTableProps {
  patents: Patent[];
}

export function PatentTable({ patents }: PatentTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE)
  );

  const columnDefs = useMemo<ColDef<Patent>[]>(
    () =>
      ALL_COLUMNS.filter((col) => visibleCols.has(col.field as string)),
    [visibleCols]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const toggleColumn = useCallback((field: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setVisibleCols(new Set(ALL_COLUMNS.map((c) => c.field as string)));
  }, []);

  const resetCols = useCallback(() => {
    setVisibleCols(new Set(DEFAULT_VISIBLE));
  }, []);

  const onSearch = useCallback((value: string) => {
    gridRef.current?.api?.setGridOption("quickFilterText", value);
  }, []);

  const onExport = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "microchip_patents.csv" });
  }, []);

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 140px)",
      }}
    >
      <Group mb="sm" justify="space-between" style={{ flexShrink: 0 }}>
        <TextInput
          placeholder="Search all patents..."
          onChange={(e) => onSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Group gap="xs">
          <Popover width={280} position="bottom-end" shadow="lg">
            <Popover.Target>
              <Button variant="light" size="xs">
                Columns ({visibleCols.size}/{ALL_COLUMNS.length})
              </Button>
            </Popover.Target>
            <Popover.Dropdown
              style={{ maxHeight: 400, overflowY: "auto" }}
            >
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={600}>
                  Toggle Columns
                </Text>
                <Group gap={4}>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    onClick={showAll}
                  >
                    All
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    onClick={resetCols}
                  >
                    Reset
                  </Button>
                </Group>
              </Group>
              <Divider mb="xs" />
              <Stack gap={6}>
                {ALL_COLUMNS.map((col) => (
                  <Checkbox
                    key={col.field as string}
                    label={col.headerName}
                    size="xs"
                    checked={visibleCols.has(col.field as string)}
                    onChange={() => toggleColumn(col.field as string)}
                  />
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>
          <Button variant="subtle" size="xs" onClick={onExport}>
            Export CSV
          </Button>
        </Group>
      </Group>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact
          ref={gridRef}
          theme={myTheme}
          rowData={patents}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          enableCellTextSelection
          tooltipShowDelay={300}
          getRowId={(p) => p.data.applicationNumber}
        />
      </div>
    </Paper>
  );
}

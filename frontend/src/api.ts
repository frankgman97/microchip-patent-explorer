import type { Patent, Stats } from "./types";

const API = "http://localhost:5002/api";

export async function fetchPatents(): Promise<Patent[]> {
  const res = await fetch(`${API}/patents`);
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API}/stats`);
  return res.json();
}

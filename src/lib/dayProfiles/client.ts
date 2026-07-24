import type { DayProfile, DayProfileQuery } from "./types";

type DayProfilesResponse = {
  ok: boolean;
  profiles?: DayProfile[];
  error?: string;
};

export async function fetchDayProfiles(query: DayProfileQuery = {}): Promise<DayProfile[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }

  const suffix = params.toString();
  const response = await fetch(`/api/day-profiles${suffix ? `?${suffix}` : ""}`);
  const body = (await response.json()) as DayProfilesResponse;

  if (!response.ok || !body.ok || !body.profiles) {
    throw new Error(body.error ?? "Failed to load day profiles");
  }

  return body.profiles;
}

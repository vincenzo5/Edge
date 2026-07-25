import { execFileSync } from "node:child_process";

export type ProcessEntry = {
  pid: number;
  ppid: number;
  rssKb: number;
  comm: string;
};

export type ProcessRssSelection = {
  bytes: number;
  method: "os-ps-max-renderer" | "os-ps-browser-fallback";
  selectedPid: number;
};

export function parsePsOutput(output: string): ProcessEntry[] {
  const entries: ProcessEntry[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;

    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const rssKb = Number(match[3]);
    const comm = match[4]?.trim() ?? "";

    if (!Number.isFinite(pid) || !Number.isFinite(ppid) || !Number.isFinite(rssKb)) continue;

    entries.push({ pid, ppid, rssKb, comm });
  }

  return entries;
}

export function isRendererCommand(command: string): boolean {
  return (
    /renderer/i.test(command) ||
    /--type=renderer\b/.test(command)
  );
}

export function collectDescendantPids(
  entries: ProcessEntry[],
  rootPid: number,
): Set<number> {
  const childrenByPpid = new Map<number, number[]>();
  for (const entry of entries) {
    const siblings = childrenByPpid.get(entry.ppid) ?? [];
    siblings.push(entry.pid);
    childrenByPpid.set(entry.ppid, siblings);
  }

  const descendants = new Set<number>([rootPid]);
  const queue = [rootPid];

  while (queue.length > 0) {
    const pid = queue.pop();
    if (pid == null) continue;
    for (const childPid of childrenByPpid.get(pid) ?? []) {
      if (descendants.has(childPid)) continue;
      descendants.add(childPid);
      queue.push(childPid);
    }
  }

  return descendants;
}

export function lookupPidRssBytes(entries: ProcessEntry[], pid: number): number | null {
  if (!Number.isFinite(pid)) return null;
  const entry = entries.find((candidate) => candidate.pid === pid);
  if (!entry) return null;
  return entry.rssKb * 1024;
}

export function selectProcessRssBytes(
  entries: ProcessEntry[],
  rootPid: number,
): ProcessRssSelection | null {
  const byPid = new Map(entries.map((entry) => [entry.pid, entry]));
  const root = byPid.get(rootPid);
  if (!root) return null;

  const descendants = collectDescendantPids(entries, rootPid);
  const rendererCandidates = entries.filter(
    (entry) => descendants.has(entry.pid) && isRendererCommand(entry.comm),
  );

  if (rendererCandidates.length > 0) {
    const best = rendererCandidates.reduce((max, entry) =>
      entry.rssKb > max.rssKb ? entry : max,
    );
    return {
      bytes: best.rssKb * 1024,
      method: "os-ps-max-renderer",
      selectedPid: best.pid,
    };
  }

  return {
    bytes: root.rssKb * 1024,
    method: "os-ps-browser-fallback",
    selectedPid: root.pid,
  };
}

export function readPsEntries(platform: NodeJS.Platform = process.platform): ProcessEntry[] {
  if (platform !== "darwin" && platform !== "linux") return [];

  try {
    const output = execFileSync("ps", ["-axo", "pid=,ppid=,rss=,command="], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    return parsePsOutput(output);
  } catch {
    return [];
  }
}

export type ChromiumProcessRssSample = {
  bytes: number | null;
  method: string;
  note: string;
};

export function sampleChromiumProcessRss(
  rootPid: number | null | undefined,
  options: { headless: boolean; platform?: NodeJS.Platform } = { headless: true },
): ChromiumProcessRssSample {
  const platform = options.platform ?? process.platform;
  const headlessNote = `headless=${options.headless}`;

  if (rootPid == null || !Number.isFinite(rootPid)) {
    return {
      bytes: null,
      method: "unavailable",
      note: `${headlessNote}; platform=${platform}; browser PID missing`,
    };
  }

  if (platform !== "darwin" && platform !== "linux") {
    return {
      bytes: null,
      method: "unavailable",
      note: `${headlessNote}; platform=${platform}; os-ps unsupported on this platform`,
    };
  }

  const entries = readPsEntries(platform);
  if (entries.length === 0) {
    return {
      bytes: null,
      method: "unavailable",
      note: `${headlessNote}; platform=${platform}; ps output empty or failed`,
    };
  }

  const selection = selectProcessRssBytes(entries, rootPid);
  if (!selection) {
    return {
      bytes: null,
      method: "unavailable",
      note: `${headlessNote}; platform=${platform}; root PID ${rootPid} not found in ps`,
    };
  }

  return {
    bytes: selection.bytes,
    method: selection.method,
    note: `${headlessNote}; platform=${platform}; pid=${selection.selectedPid}`,
  };
}

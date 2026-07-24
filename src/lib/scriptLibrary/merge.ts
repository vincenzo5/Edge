import type {
  ScriptDraft,
  ScriptLibraryEntry,
  ScriptLibraryState,
  ScriptRevisionRecord,
} from "./types";
import { MAX_REVISIONS_PER_SCRIPT, MAX_SCRIPTS } from "./types";

function mergeDrafts(
  local?: ScriptDraft,
  remote?: ScriptDraft,
  winnerUpdatedAt?: number,
): ScriptDraft | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;
  const localAt = local.updatedAt;
  const remoteAt = remote.updatedAt;
  if (localAt === remoteAt) return local;
  if (winnerUpdatedAt !== undefined) {
    return localAt === winnerUpdatedAt ? local : remote;
  }
  return localAt >= remoteAt ? local : remote;
}

function revisionSortScore(
  revision: ScriptRevisionRecord,
  inBoth: boolean,
): number {
  const compiledAt = revision.compiledAt ?? 0;
  return (inBoth ? 1_000_000_000_000 : 0) + compiledAt;
}

function mergeRevisions(
  localRevisions: ScriptRevisionRecord[],
  remoteRevisions: ScriptRevisionRecord[],
): ScriptRevisionRecord[] {
  const localByHash = new Map(localRevisions.map((rev) => [rev.revision, rev]));
  const remoteByHash = new Map(remoteRevisions.map((rev) => [rev.revision, rev]));
  const allHashes = new Set([...localByHash.keys(), ...remoteByHash.keys()]);

  const merged: ScriptRevisionRecord[] = [];
  for (const hash of allHashes) {
    const localRev = localByHash.get(hash);
    const remoteRev = remoteByHash.get(hash);
    if (localRev && remoteRev) {
      const localCompiled = localRev.compiledAt ?? 0;
      const remoteCompiled = remoteRev.compiledAt ?? 0;
      merged.push(localCompiled >= remoteCompiled ? localRev : remoteRev);
    } else {
      merged.push((localRev ?? remoteRev)!);
    }
  }

  merged.sort((a, b) => {
    const aBoth = localByHash.has(a.revision) && remoteByHash.has(a.revision);
    const bBoth = localByHash.has(b.revision) && remoteByHash.has(b.revision);
    return revisionSortScore(b, bBoth) - revisionSortScore(a, aBoth);
  });

  return merged.slice(0, MAX_REVISIONS_PER_SCRIPT);
}

function mergeEntries(local: ScriptLibraryEntry, remote: ScriptLibraryEntry): ScriptLibraryEntry {
  const winner = local.updatedAt >= remote.updatedAt ? local : remote;
  const revisions = mergeRevisions(local.revisions, remote.revisions);

  let headRevision = winner.headRevision;
  if (headRevision && !revisions.some((rev) => rev.revision === headRevision)) {
    headRevision = revisions.at(-1)?.revision ?? null;
  }
  if (!headRevision && revisions.length > 0) {
    headRevision = revisions.at(-1)!.revision;
  }

  return {
    scriptId: local.scriptId,
    displayName: winner.displayName,
    createdAt: Math.min(local.createdAt, remote.createdAt),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    headRevision,
    draft: mergeDrafts(local.draft, remote.draft, winner.updatedAt),
    revisions,
  };
}

export function mergeScriptLibraryStates(
  local: ScriptLibraryState,
  remote: ScriptLibraryState,
): ScriptLibraryState {
  const localById = new Map(local.scripts.map((entry) => [entry.scriptId, entry]));
  const remoteById = new Map(remote.scripts.map((entry) => [entry.scriptId, entry]));
  const allIds = new Set([...localById.keys(), ...remoteById.keys()]);

  const mergedScripts: ScriptLibraryEntry[] = [];
  for (const scriptId of allIds) {
    const localEntry = localById.get(scriptId);
    const remoteEntry = remoteById.get(scriptId);
    if (localEntry && remoteEntry) {
      mergedScripts.push(mergeEntries(localEntry, remoteEntry));
    } else {
      mergedScripts.push((localEntry ?? remoteEntry)!);
    }
  }

  mergedScripts.sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    version: 1,
    scripts: mergedScripts.slice(0, MAX_SCRIPTS),
  };
}

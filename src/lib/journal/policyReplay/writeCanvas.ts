import type { PolicyReplayPayload, ReplayTradeRow } from "./types";

/** Canvas expects legacy `atr` field (1R price distance). */
function compactForCanvas(payload: PolicyReplayPayload) {
  return {
    ...payload,
    trades: payload.trades.map((t) => ({
      ...t,
      atr: t.rUnitPrice,
    })),
  };
}

const CANVAS_BODY = String.raw`
type PolicyId = keyof typeof DATA.scoreboard;
type Scope = "all" | "long" | "short";

const POLICY_META: { id: PolicyId; name: string; levers: string; group: string }[] = [
  { id: "actual", name: DATA.names.actual, levers: DATA.levers.actual, group: "baseline" },
  { id: "step_trail_025", name: DATA.names.step_trail_025, levers: DATA.levers.step_trail_025, group: "step" },
  { id: "step_trail_05", name: DATA.names.step_trail_05, levers: DATA.levers.step_trail_05, group: "step" },
  { id: "step_trail_1", name: DATA.names.step_trail_1, levers: DATA.levers.step_trail_1, group: "step" },
  { id: "full_trail_tight", name: DATA.names.full_trail_tight, levers: DATA.levers.full_trail_tight, group: "continuous" },
  { id: "full_trail_wide", name: DATA.names.full_trail_wide, levers: DATA.levers.full_trail_wide, group: "continuous" },
  { id: "fixed_1r", name: DATA.names.fixed_1r, levers: DATA.levers.fixed_1r, group: "other" },
  { id: "fixed_2r", name: DATA.names.fixed_2r, levers: DATA.levers.fixed_2r, group: "other" },
  { id: "fixed_3r", name: DATA.names.fixed_3r, levers: DATA.levers.fixed_3r, group: "other" },
  { id: "be_only", name: DATA.names.be_only, levers: DATA.levers.be_only, group: "other" },
  { id: "half_be", name: DATA.names.half_be, levers: DATA.levers.half_be, group: "other" },
  { id: "half_trail", name: DATA.names.half_trail, levers: DATA.levers.half_trail, group: "other" },
  { id: "scale_3x", name: DATA.names.scale_3x, levers: DATA.levers.scale_3x, group: "other" },
  { id: "swing_harvest", name: DATA.names.swing_harvest, levers: DATA.levers.swing_harvest, group: "other" },
];

function fmtPf(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "∞";
  return n.toFixed(2);
}

function toneForR(r: number): "success" | "danger" | undefined {
  if (r > 0) return "success";
  if (r < 0) return "danger";
  return undefined;
}

function money(n: number) {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function boardFor(scope: Scope) {
  const sb =
    scope === "long"
      ? DATA.scoreboardLong
      : scope === "short"
        ? DATA.scoreboardShort
        : DATA.scoreboard;
  return POLICY_META.map((p) => {
    const raw = sb[p.id]!;
    return {
      ...p,
      m: {
        ...raw,
        profitFactor: raw.profitFactor == null ? Number.POSITIVE_INFINITY : raw.profitFactor,
      },
    };
  });
}

export default function IbLiveStepTrailReplay() {
  const [policyId, setPolicyId] = useCanvasState<PolicyId>("policyId", "step_trail_05");
  const [scope, setScope] = useCanvasState<Scope>("scope", "all");
  const meta = POLICY_META.find((p) => p.id === policyId) ?? POLICY_META[0]!;
  const board = boardFor(scope);
  const bestNet = Math.max(...board.map((b) => Number(b.m.netR)));
  const selected = board.find((b) => b.id === policyId)?.m ?? DATA.scoreboard[policyId];
  const rank =
    scope === "long" ? DATA.rankLong : scope === "short" ? DATA.rankShort : DATA.rankAll;

  const scopedTrades = DATA.trades.filter((t) =>
    scope === "all" ? true : t.direction === scope,
  );

  const journalRows = scopedTrades.map((t) => {
    const r = t.results[policyId]!;
    return {
      symbol: t.symbol,
      dir: t.direction,
      window: t.openedAt + " → " + t.closedAt,
      pnl: t.netPnl,
      atr: t.atr,
      mfe: t.mfeR,
      mae: t.maeR,
      actualR: t.actualR,
      policyR: r.r,
      exit: r.x,
    };
  });

  const trailCompare = ["step_trail_025", "step_trail_05", "step_trail_1", "full_trail_tight", "full_trail_wide", "actual"] as const;
  const shortSymbols = DATA.trades.filter((t) => t.direction === "short").map((t) => t.symbol);

  return (
    <Stack gap={20} style={{ padding: 20 }}>
      <Stack gap={6}>
        <H1>IBKR live — step trails vs other policies</H1>
        <Text tone="secondary">
          Account {DATA.account} · {DATA.tradeCount} stocks ({DATA.longCount}L / {DATA.shortCount}S)
          · daily close paths · read-only
        </Text>
      </Stack>

      <Callout tone="info" title="Step trail rules">
        Initial stop = −1R. When price first reaches +step, stop → break-even (0). Every further
        +step milestone moves the stop up by +step (always one step behind the last milestone).
      </Callout>

      <Callout tone="warning" title="Method">
        {DATA.note} Excluded: {DATA.excluded.join("; ")}.
      </Callout>

      <H2>Trail head-to-head</H2>
      <Table
        headers={["Policy", "Type", "All net R", "Long net R", "Short net R", "All exp", "All WR"]}
        columnAlign={["left", "left", "right", "right", "right", "right", "right"]}
        rows={trailCompare.map((id) => [
          DATA.names[id],
          id.startsWith("step") ? "step ratchet" : id.startsWith("full") ? "continuous" : "baseline",
          (DATA.scoreboard[id].netR >= 0 ? "+" : "") + DATA.scoreboard[id].netR.toFixed(2),
          (DATA.scoreboardLong[id].netR >= 0 ? "+" : "") + DATA.scoreboardLong[id].netR.toFixed(2),
          (DATA.scoreboardShort[id].netR >= 0 ? "+" : "") + DATA.scoreboardShort[id].netR.toFixed(2),
          (DATA.scoreboard[id].expectancy >= 0 ? "+" : "") + DATA.scoreboard[id].expectancy.toFixed(2),
          DATA.scoreboard[id].winRate + "%",
        ])}
        rowTone={trailCompare.map((id) =>
          id === "step_trail_025" ? "success" : id === "actual" ? "info" : undefined,
        )}
      />

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Longs ({DATA.longCount}) — full ranking</CardHeader>
          <CardBody>
            <Table
              headers={["#", "Policy", "Net R", "Exp", "WR", "PF"]}
              columnAlign={["right", "left", "right", "right", "right", "right"]}
              rows={DATA.rankLong.map((r, i) => [
                String(i + 1),
                r.name,
                (r.netR >= 0 ? "+" : "") + r.netR.toFixed(2),
                (r.expectancy >= 0 ? "+" : "") + r.expectancy.toFixed(2),
                r.winRate + "%",
                fmtPf(r.profitFactor),
              ])}
              rowTone={DATA.rankLong.map((r, i) =>
                i === 0 ? "success" : r.id.startsWith("step_trail") ? "info" : undefined,
              )}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Shorts ({DATA.shortCount}) — full ranking</CardHeader>
          <CardBody>
            {DATA.shortCount <= 2 ? (
              <Callout tone="info" title={"Only " + DATA.shortCount + " short trade(s)"}>
                Not enough to pick a short-side winner. Sample: {shortSymbols.join(", ") || "none"}.
              </Callout>
            ) : null}
            <Table
              headers={["#", "Policy", "Net R", "Exp", "WR", "PF"]}
              columnAlign={["right", "left", "right", "right", "right", "right"]}
              rows={DATA.rankShort.map((r, i) => [
                String(i + 1),
                r.name,
                (r.netR >= 0 ? "+" : "") + r.netR.toFixed(2),
                (r.expectancy >= 0 ? "+" : "") + r.expectancy.toFixed(2),
                r.winRate + "%",
                fmtPf(r.profitFactor),
              ])}
              rowTone={DATA.rankShort.map((r, i) =>
                i === 0 ? "success" : r.id.startsWith("step_trail") ? "info" : undefined,
              )}
            />
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader>Net R by policy — longs</CardHeader>
        <CardBody>
          <BarChart
            categories={DATA.rankLong.map((r) => r.name)}
            series={[{ name: "Long net R", data: DATA.rankLong.map((r) => r.netR), tone: "info" }]}
            height={280}
          />
          <Text tone="tertiary" style={{ marginTop: 8 }}>
            Source: {DATA.account} · daily closes · planned risk or ATR(14) R unit
          </Text>
        </CardBody>
      </Card>

      <Divider />

      <Row align="center" justify="space-between" wrap>
        <H2>Journal under one policy</H2>
        <Row gap={8} wrap>
          <Select
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            options={[
              { value: "all", label: "All directions" },
              { value: "long", label: "Longs only" },
              { value: "short", label: "Shorts only" },
            ]}
          />
          <Select
            value={policyId}
            onChange={(v) => setPolicyId(v as PolicyId)}
            options={POLICY_META.map((p) => ({ value: p.id, label: p.name }))}
          />
        </Row>
      </Row>

      <Stack gap={4}>
        <H3>{meta.name} · {scope}</H3>
        <Text tone="secondary">{meta.levers}</Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat
          label="Net R"
          value={(selected.netR >= 0 ? "+" : "") + selected.netR.toFixed(2) + "R"}
          tone={toneForR(selected.netR)}
        />
        <Stat label="Win rate" value={selected.winRate + "%"} />
        <Stat
          label="Expectancy"
          value={(selected.expectancy >= 0 ? "+" : "") + selected.expectancy.toFixed(2) + "R"}
          tone={toneForR(selected.expectancy)}
        />
        <Stat label="Profit factor" value={fmtPf(selected.profitFactor)} />
      </Grid>

      <Table
        headers={["Policy", "Net R", "Win %", "Exp", "PF", "Avg win", "Avg loss", "Max DD"]}
        columnAlign={["left","right","right","right","right","right","right","right"]}
        rows={board.map((b) => [
          b.name,
          (b.m.netR >= 0 ? "+" : "") + b.m.netR.toFixed(2),
          b.m.winRate + "%",
          (b.m.expectancy >= 0 ? "+" : "") + b.m.expectancy.toFixed(2) + "R",
          fmtPf(b.m.profitFactor),
          "+" + b.m.avgWin.toFixed(2) + "R",
          "−" + b.m.avgLoss.toFixed(2) + "R",
          b.m.maxDdR.toFixed(2) + "R",
        ])}
        rowTone={board.map((b) =>
          b.id === policyId ? "info" : b.m.netR === bestNet ? "success" : undefined,
        )}
      />

      <Table
        headers={["Symbol", "Dir", "Hold", "Actual $", "1R $", "MFE", "MAE", "Actual R", "Policy R", "Exit"]}
        columnAlign={["left","left","left","right","right","right","right","right","right","left"]}
        rows={journalRows.map((r) => [
          r.symbol,
          r.dir,
          r.window,
          money(r.pnl),
          r.atr.toFixed(2),
          r.mfe.toFixed(2) + "R",
          r.mae.toFixed(2) + "R",
          (r.actualR >= 0 ? "+" : "") + r.actualR.toFixed(2) + "R",
          (r.policyR >= 0 ? "+" : "") + r.policyR.toFixed(2) + "R",
          r.exit,
        ])}
        rowTone={journalRows.map((r) => toneForR(r.policyR))}
      />

      <Text tone="tertiary">
        Best overall in this close-path replay: {rank[0]!.name} (+{rank[0]!.netR.toFixed(2)}R).
        Rank shown for current scope filter.
      </Text>
    </Stack>
  );
}
`;

export function renderPolicyReplayCanvas(payload: PolicyReplayPayload): string {
  const dataJson = JSON.stringify(compactForCanvas(payload));
  return `import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
} from "cursor/canvas";

const DATA = ${dataJson} as const;

${CANVAS_BODY.trim()}
`;
}

export function defaultPolicyReplayCanvasPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return `${home}/.cursor/projects/Users-vincentn-TV-AI/canvases/ib-live-risk-policy-replay.canvas.tsx`;
}

export type CanvasTradeRow = ReplayTradeRow & { atr: number };

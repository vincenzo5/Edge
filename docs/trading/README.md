# Trading research notes

Educational / research docs related to market structure and strategy study (not Edge product roadmaps).

| Doc | Topic |
|-----|--------|
| [swing-market-regime-systems.md](./swing-market-regime-systems.md) | Practitioner **big-picture / regime** systems for daily swing trading (O’Neil, Weinstein, Minervini, Elder, et al.) — indicators, rules, gaps |
| [bbr-strategy-playbook.md](./bbr-strategy-playbook.md) | Wolves of Wealth / Mr. Banks **BBR** (Bounce · Break · Reject) — execution rules + estimated stats |
| [market-wizards-standout-results.md](./market-wizards-standout-results.md) | Schwager *Market Wizards* series — standout absolute $, CAGR, and risk-adjusted claims |
| [wolves-discord/](./wolves-discord/) | Discord mine archive — market context, daily desk, EP swing, bots (2026-07-29) |
| [day-classification-visual-guide.md](./day-classification-visual-guide.md) | Market Profile day types / open types / gaps (L1–L3 visual pack) |

Asset images for day classification live under [`assets/`](./assets/).

## Journal policy replay

Re-run closed-trade counterfactual analysis (step trails, fixed TP, continuous trail, etc.):

```bash
npm run journal:policy-replay
```

Skill: [`.cursor/skills/journal-policy-replay/SKILL.md`](../../.cursor/skills/journal-policy-replay/SKILL.md). Outputs `docs/evidence/policy-replay-latest.json` and refreshes the IB live policy comparison canvas.

## Paper functional verification (Edge product)

| Doc | Topic |
|-----|--------|
| [step-trail-025r-paper-functional-test-plan.md](./step-trail-025r-paper-functional-test-plan.md) | LLM-handoff plan to verify **Step trail 0.25R** trade lifecycle automation on paper IBKR (bracket → arm → ratchet → flatten → kill) |

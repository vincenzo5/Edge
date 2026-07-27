# GitHub cloud CI disabled

Edge does not use GitHub Actions runners.

Local gates:

- Day-to-day / pre-push: `npm run ci:local` (`check:startup`)
- Full: `npm run check`
- Chart perf: `CHART_PERF_BUDGET_STRICT=1 npm run perf:chart`
- Prod promote: `npm run local:prod:container:deploy -- --revision HEAD`

Install git hooks: `npm run hooks:install`

# Session Exit Checklist

Apply before ending a Cursor session or handing off long-running work. Mirrors [harness-status-checklist.md](./harness-status-checklist.md) entry checks; pairs with machine checks in `scripts/validate-project-status.mts`.

## When to Use

Walk this checklist as the **last step** before ending your turn when:

- Work touched tracked features or `docs/PROJECT-STATUS.md`
- Current Verified State is **Pending**, **Active**, or **Passing**
- Another agent or developer may pick up without verbal context

## Harness Records

- [ ] Active Work row updated with final **State** and completion evidence (concrete test counts / build / app-level measurements — not paraphrases)
- [ ] **Passing** used only when planned verification tiers passed; app-level still TODO → keep **Pending**
- [ ] Task Contract created or updated for long-running or cross-component work
- [ ] Session Log entry appended for today (`### YYYY-MM-DD — …`) when work ran this session
- [ ] Current Verified State block updated (**Current task**, **State**, **Latest verification**, **Evidence**, **Current blocker**, **Next best step**, **Last updated**)
- [ ] Closest architecture doc updated if contracts or structure changed

## Verification Evidence

- [ ] Completion evidence quotes actual command output (e.g. `67 tests passed`, `npm run build` passed, `check:startup` passed (26 tests), or app-level measurement with numbers/ms/`meta.source:`)
- [ ] Appropriate verification tier run for risk (Focused / Build / App-level / Full per [testing-verification-checklist.md](./testing-verification-checklist.md))
- [ ] Blockers recorded explicitly (or **none** stated)

## Agent-Honor Items (not machine-validated)

- [ ] `.env.local` or local config changes flagged for user revert when not committed
- [ ] Todos closed; no `in_progress` items left open
- [ ] Temporary/debug artifacts removed
- [ ] Next best step is a single concrete action
- [ ] If `docs/PROJECT-STATUS.md` exceeds ~300 lines, prune per § Harness Retention (move cold history to `docs/status-archive/`)

## Validator Hooks

`npm run lint:instructions` enforces:

- **Passing** rows cannot contain `pending` in verification evidence
- **Passing** rows must cite concrete verification results
- When state is **Pending** or **Passing**, a Session Log entry dated today must exist
- Cross-component Active Work rows (files span multiple of `src/lib/`, `src/app/api/`, `src/app/components/`, `services/`) require a matching Task Contract heading

See [planning-router.md](./planning-router.md) for plan entry; this doc covers exit.

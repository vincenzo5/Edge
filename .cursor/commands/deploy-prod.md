Ship or promote local Docker production.

Read and follow `.cursor/skills/deploy-local-prod/SKILL.md`. Do not improvise alternate deploy paths.

- No input → **ship** latest on main (`local:prod:ship`; commit first if dirty)
- With input → **promote** that revision only

Revision (optional): {{input}}

Stop on the first failed gate. Report success or use the skill's failure report template.

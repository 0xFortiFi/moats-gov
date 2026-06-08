---
name: Drizzle push of constraints on non-empty tables
description: Why `db run push` fails non-interactively and how to add constraints safely
---

# Adding constraints to tables with existing rows

`pnpm --filter @workspace/db run push` (drizzle-kit push) is INTERACTIVE. When adding a
unique/not-null constraint to a table that already has rows, it prompts "Do you want to
truncate?" and then dies with `Error: Interactive prompts require a TTY terminal` in the
agent shell.

**How to apply:** if the data already satisfies the constraint (verify first, e.g. no
duplicate `(proposal_id, wallet_address)`), add it directly with SQL:
`ALTER TABLE <t> ADD CONSTRAINT <name> UNIQUE (...);`
Keep the matching constraint in the Drizzle schema so the code and DB stay in sync. Never
let drizzle-kit truncate to satisfy a prompt.

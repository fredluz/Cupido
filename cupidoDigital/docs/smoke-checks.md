# Smoke Checks: Quiz -> Groups -> Direct/Group Chat -> Reveal

This project includes a transaction-based smoke check that validates the core backend flow against a Supabase Postgres database.

## What It Verifies
- `submit_quiz_and_refresh_matches` is callable for multiple synthetic users.
- A mutual top-3 edge exists for at least one synthetic pair.
- Direct chat baseline still works:
  - `create_thread_if_mutual` works for an eligible pair and is idempotent.
  - `send_thread_message` and `list_thread_messages` work for both participants.
- Primary group assignment exists for all synthetic users.
- Group chat flow works for same-group members:
  - group thread is discoverable by multiple members
  - group messaging send/read works for multiple members
- Group-based DM eligibility works:
  - a same-group pair that is not mutual top-3 can still create a direct thread.
- Profile lock enforcement works:
  - changed profile submissions are rejected after lock activation.
- Reveal toggle remains consistent across direct and group messaging:
  - `app_settings.reveal_enabled` is reflected in both direct and group message rows
  - `sender_display_name` swaps between alias and real-name behavior as reveal toggles.

## RPC/Schema Discovery Behavior
- Group checks auto-discover group RPCs by preferred names first, then regex fallback against `public` functions.
- Primary group source is resolved from either:
  - `quiz_responses` group column (`primary_group_id`/`group_id`/`assigned_group_id`)
  - a group-membership table with `user_id` + group-id column.
- Profile lock is applied through either:
  - `quiz_responses` lock columns (`is_profile_locked`/`profile_locked`/`submission_locked` or `*_locked_at`)
  - a lock RPC matched by `lock.*profile` naming.
- If required group/profile surfaces are missing, the smoke check fails with explicit diagnostics.

## Required Environment Variables
- `SUPABASE_DB_URL`: Supabase Postgres connection string.

## Prerequisites
- `psql` in `PATH` or Docker installed (script auto-falls back to `postgres:16-alpine`).
- Database should already have the latest migrations applied.
- Use a privileged Supabase Postgres URL (for example, `postgres` user) so the script can:
  - execute backend RPCs that rely on session user context
  - temporarily flip `app_settings.reveal_enabled`
  - apply profile-lock toggles in a rollback-only transaction.

## Run
From `cupidoDigital/`:

```bash
SUPABASE_DB_URL='postgresql://...' npm run smoke:core-flow
```

Or directly:

```bash
SUPABASE_DB_URL='postgresql://...' bash ./scripts/smoke-core-flow.sh
```

## Safety / Idempotency
- The script generates unique synthetic user IDs for each run.
- It runs inside one transaction and ends with `ROLLBACK`, so no synthetic data or reveal-toggle state persists.

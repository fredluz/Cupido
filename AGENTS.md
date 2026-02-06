# AGENTS.md

## Project Overview
- Repo contains a single app in `cupidoDigital/`.
- Stack: Vite + React + TypeScript + Supabase.
- Product: personality quiz that computes matches; next feature is anonymous chat between matched users.

## Source of Truth
- Implementation plan: `cupidoDigital/docs/revival-plan.md`.
- Follow that plan in order unless explicitly redirected by the user.

## Current Known State
- `src/supabaseClient.ts` is missing but imported in `src/App.tsx`.
- Previous Supabase project was deleted.
- Backend schema/migrations are not present in repo yet.

## Execution Priorities (Phase 1)
1. Recreate Supabase schema + RLS via migrations.
2. Add Supabase client/env wiring.
3. Restore working quiz submit/read flow.
4. Move match eligibility to backend logic (mutual top-3).
5. Add anonymous chat threads/messages for mutual top-3 pairs.
6. Add global reveal toggle support (admin SQL-driven).
7. Add tests/smoke checks for quiz->match->chat->reveal flow.

## Product Decisions Already Locked
- Chat scope: mutual top-3 only.
- Identity model: device UUID (`localStorage.user_id`) + RLS.
- Pre-reveal identity: generated alias per chat participant.
- Reveal trigger: manual admin toggle in Supabase SQL.
- Post-reveal behavior: reveal in-place in existing chats.
- Deployment target: Cloudflare Pages, but deploy setup is deferred until after Phase 1 implementation.

## Constraints
- Do not introduce login/auth flows unless explicitly requested.
- Keep existing quiz UX mostly intact; prefer additive changes.
- Keep chat access stable once thread exists (even if rankings later shift).
- Keep code and schema changes incremental and reviewable.

## Delivery Expectations For Implementation Sessions
- Make concrete code changes (not just plans).
- Run relevant checks/tests after each major step.
- Report blockers immediately with precise file/command context.
- When uncertain, default to `cupidoDigital/docs/revival-plan.md`.

## Suggested Milestones
1. `supabase/` migrations + SQL policies merged.
2. frontend compiles with new `supabaseClient.ts` and env docs.
3. quiz submit + top-3 retrieval functional on fresh DB.
4. chat UI + message persistence functional for mutual pairs.
5. reveal toggle updates active UI without reload.

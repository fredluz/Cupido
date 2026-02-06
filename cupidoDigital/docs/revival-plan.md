# Cupido Revival Plan (Phase 1: App + Backend, Deploy Later)

## Summary
Rebuild the app with a new Supabase backend, restore the quiz-to-match flow, and add anonymous 1:1 chat for **mutual top-3 matches only**. Keep no-login UX (device UUID), and use a global admin SQL toggle to reveal identities in-place. Deployment work is intentionally deferred.

## Current-State Findings
1. App is a single Vite + React + TypeScript frontend in `cupidoDigital/`.
2. Matching logic is currently client-side in `src/App.tsx`.
3. `src/supabaseClient.ts` is imported but missing.
4. No backend migrations/schema files are currently present.

## Phase 1 Scope (Now)
- Recreate Supabase project and schema.
- Restore quiz submit + match retrieval flow.
- Add anonymous chat for mutual top-3 pairs.
- Add global reveal toggle support and realtime UI swap.
- Add tests/smoke checks for core flow.

## Out of Scope (Later)
- Hosting/deployment setup and CI/CD (Cloudflare Pages handled in a later phase).

## Implementation Plan

### 1. Re-establish Supabase foundation
1. Create a new Supabase project.
2. Add `src/supabaseClient.ts`.
3. Add `.env.example` with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Keep no-login identity with `localStorage.user_id` UUID.

### 2. Define backend schema (migrations)
Create migrations in `supabase/migrations/` for:
1. `quiz_responses`
   - `id`, `user_id` (unique), `user_name`, `instagram_handle` (or keep `phone` compatibility)
   - `gender`, `looking_for`
   - category score fields: `romantic`, `adventurous`, `intellectual`, `creative`, `chill`, `social`, `ambitious`
   - `created_at`, `updated_at`
2. `match_edges`
   - `id`, `user_a_id`, `user_b_id`
   - `compatibility_a_to_b`, `compatibility_b_to_a`
   - `is_mutual_top3`
   - unique pair on ordered user IDs
3. `chat_threads`
   - `id`, `user_a_id`, `user_b_id`, `created_at`, `revealed_at` (nullable)
4. `chat_messages`
   - `id`, `thread_id`, `sender_user_id`, `body`, `created_at`
5. `chat_aliases`
   - `thread_id`, `user_id`, `alias`
6. `app_settings`
   - singleton setting row for `reveal_enabled`
   - optional `revealed_at` timestamp

### 3. Matching logic + eligibility
1. Move ranking/eligibility computation to DB-side RPC/functions.
2. On quiz submit/update:
   - upsert `quiz_responses`
   - recompute caller top-3
   - refresh `match_edges.is_mutual_top3`
3. Allow chat-thread creation only when pair is mutual top-3.
4. Once a thread exists, keep access even if ranking changes later.

### 4. Anonymous chat + reveal behavior
1. Before reveal:
   - show generated stable alias per participant per thread
   - hide real names in chat UI
2. Reveal trigger:
   - admin runs SQL update in Supabase to set `app_settings.reveal_enabled = true`
3. After reveal:
   - existing chats remain open
   - names replace aliases in-place
4. Use Supabase Realtime on settings (and optionally thread state) to update active sessions without refresh.

### 5. Frontend updates
1. Preserve quiz/results UX as baseline.
2. Add chat UI in results area:
   - list mutual chat threads
   - thread detail/messages
   - compose/send message
3. Add services/hooks for:
   - `getMyProfile`
   - `submitQuiz`
   - `getMatches`
   - `getOrCreateThread`
   - `listMessages`
   - `sendMessage`
   - `subscribeReveal`
4. Keep compatibility for existing `phone` field or migrate cleanly to `instagram_handle`.

### 6. Security and RLS
1. Enable RLS on all user-facing tables.
2. Policies:
   - users can access only rows tied to their `user_id`
   - thread/message access only for thread participants
3. Restrict thread creation path to validated RPC (mutual-top3 check).
4. Document trust limitation of UUID identity (acceptable for low-stakes event app).

## Interfaces / Types to Add
1. `src/supabaseClient.ts`
2. TS types:
   - `MatchEdge`
   - `ChatThread`
   - `ChatMessage`
   - `AppSetting`
3. RPC interfaces:
   - `submit_quiz_and_refresh_matches(payload)`
   - `create_thread_if_mutual(match_user_id)`
   - `list_my_threads()`

## Test Cases and Acceptance Criteria
1. Quiz submit persists row and returns/refetches top-3.
2. Gender/preference reciprocity filter remains correct.
3. Chat creation succeeds only for mutual top-3 pairs.
4. Non-eligible pairs cannot create or access threads.
5. Anonymous mode shows aliases only.
6. Reveal toggle updates active clients and shows real names in-place.
7. Existing chats persist across refresh and post-ranking changes.
8. RLS blocks non-participant data access.

## Assumptions and Defaults
1. Supabase data is rebuilt from zero (no old data recovery).
2. Identity remains device UUID + RLS.
3. Chat scope is mutual top-3 only.
4. Reveal is global and manually toggled via SQL.
5. Hosting/deploy handled later as a separate phase.

## Suggested Build Order
1. Supabase schema + RLS migrations
2. `supabaseClient` + env wiring
3. Quiz submit/read path restoration
4. DB-side matching and mutual edge updates
5. Thread creation + alias generation
6. Chat messages + realtime updates
7. Reveal toggle + in-place identity swap
8. QA pass and bugfix sweep

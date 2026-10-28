# game-connect — "Game Night" realtime 2-player mini-games

This file is the project's AI context. It replaces the chat history, which was deleted on 28 Oct 2026. Cursor, Kiro, Antigravity, and Claude Code read `AGENTS.md`. After any change that matters (game added, migration applied, deploy), update **History** and **Current state** here. Original approved build plan: [docs/ai-context/original-plan.md](docs/ai-context/original-plan.md).

## Owner and working style

- Owner: Dinesh Kumar R (GitHub `dineshwondersoft-2509`, which owns the GitHub repo and the Supabase project). Built on a company-managed Windows 11 laptop (PowerShell, no admin rights).
- The user wants direct action, then a short plain-language result. Ask before pushing, deploying, or running migrations against production.
- Secrets: never commit or write into this file the Supabase personal access token (`sbp_...`), the Netlify personal access token (`nfp_...`), or the Supabase service-role key. Use CLI logins (`npx supabase login`, `npx netlify login`, `gh auth login`).

## What it is

Friends open the site, enter a nickname, create a room, share the link, and play in real time. No accounts (Supabase anonymous auth). Built to cost nothing: static React app on Netlify, Supabase free tier as the only backend. No Docker, AWS, Redis, or custom server, by the user's explicit requirement.

- Live: https://game-night-play.netlify.app
- GitHub: https://github.com/dineshwondersoft-2509/game-night (branch `main`)
- Supabase project ref: `pytqmosldebvztmtdauz` (dashboard: https://supabase.com/dashboard/project/pytqmosldebvztmtdauz), created under the user's GitHub account `dineshwondersoft-2509`
- Netlify site: `game-night-play`

Games (all 2 players, server-authoritative):

| Game | Options at create | Seats / notes |
|---|---|---|
| Tic-Tac-Toe | Board 3x3 / 5x5 / 7x7 | X / O |
| Dots and Boxes | Rows of boxes, number input limited to 2–8 | A / B; completing a box keeps your turn |
| Rock Paper Scissors | Best of 3 / 5 / 7 | Simultaneous pick, locked until both choose |
| Memory Match | 8 / 12 / 18 pairs | Match keeps turn, miss passes turn after a brief peek |
| Connect Four | — | Registry stub, `status: 'coming_soon'` |

Nickname can be changed on Create and inside the room (syncs to the other player). Rematch needs both players to agree and keeps the same size option.

## Run

```powershell
cd game-connect
npm install
# create .env (git-ignored) with the public client config:
#   VITE_SUPABASE_URL=https://pytqmosldebvztmtdauz.supabase.co
#   VITE_SUPABASE_ANON_KEY=sb_publishable_2K4upY7IPk7cdFcx4bUJyA_QWvNz_l6
npm run dev      # http://localhost:5173
npm test         # vitest (game logic + authSession)
npm run build
```

The two values above are the publishable client key and URL; they are already public in the deployed bundle. Never put the service-role key or any `sbp_` / `nfp_` token in the frontend or in these docs.

## Deploy

- Normal path: push to `main`. Netlify is linked to the GitHub repo (deploy key + GitHub webhook to a Netlify build hook) and rebuilds automatically. Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set on the Netlify site.
- Direct path (used in past sessions): `npm run build` then `npx netlify deploy --prod --dir=dist`. Needs `npx netlify login` (or `NETLIFY_AUTH_TOKEN`).
- Database: new SQL goes in a new file under `supabase/migrations/` and is applied with the Supabase CLI: `npx supabase login`, `npx supabase link --project-ref pytqmosldebvztmtdauz`, `npx supabase db push`. Or paste it into the dashboard SQL Editor.
- `netlify.toml` has the SPA redirect so `/game/ABC123` works on refresh.
- Netlify team SSO / password protection was turned off so the site is public.

## Architecture

- `src/games/<id>/` is a plugin: pure `gameLogic.ts` (+ test), `Board.tsx`, `index.ts` exporting a `GameDefinition`. `src/games/registry.ts` lists them. Home, Create, and GameRoom read only from the registry; GameRoom renders `definition.Board`. Room chrome never imports a specific game.
- All mutations go through Postgres RPCs (`SECURITY DEFINER`): `create_game(p_game_type, p_nickname, p_options)`, `join_game`, `make_move` (dispatches on `game_type`, move is opaque `jsonb`), `request_rematch`, `leave_game`, `heartbeat`, `update_nickname`; reads via `get_game_by_room`. Each migration that adds a game re-creates `create_game` / `make_move` / `request_rematch` and the seat/board helpers, so the newest migration holds the current definitions. RLS blocks direct writes to `games` / `game_players`. The database is the authority on legality; TS logic mirrors it for tests and UI hints.
- Realtime: one subscription per room (`useRealtimeGame.ts`), cleaned up on unmount, refetch on reconnect, "Reconnecting..." / "Connected" banner.
- Presence: heartbeat; opponent shown stale after 45 s, "left" after 150 s (`useGameRoom.ts`). Explicit Leave shows immediately.
- Identity: Supabase anonymous session in localStorage key `game-night-auth`; nickname and last room also in localStorage so refresh returns to the same seat.
- Room codes: 6 chars without confusing characters (`utils/roomCode.ts`).
- Migrations in order: `20260809100000_init_game_night.sql`, `..._dots_and_boxes.sql`, `..._sizes_and_nickname.sql`, `..._rock_paper_scissors.sql`, `..._memory_match.sql`.

Adding a game: plugin folder -> register with `status: 'available'` -> new migration extending `initial_board_for_game`, seat helpers (`first_seat_for_game` / `next_seat_for_game` / `max_players_for_game`) and a `make_move` branch -> deploy. See README "Adding a new game". Suggested next games (user asked for ideas on 11 Aug, not yet chosen): Connect Four, Gomoku, Reversi, Battleship, Hangman, Trivia duel.

## Known operational issues

- **Supabase free tier pauses the project after inactivity.** Symptom: "Failed to fetch" on create, signup call fails, DNS for `pytqmosldebvztmtdauz.supabase.co` does not resolve. Fix: Supabase dashboard -> Restore project. Happened on 25 Aug 2026.
- Stale refresh token hang (28 Aug 2026): `/auth/v1/token?grant_type=refresh_token` loaded forever, so create never finished. Fixed by `src/lib/authSession.ts`: clear expired sessions before the client starts, 10 s timeout on all Supabase requests (`AUTH_TIMEOUT_MS`), fresh anonymous sign-in if refresh fails, and an `AuthErrorScreen` with "Try again". Manual escape hatch for users: delete localStorage `game-night-auth` and reload.
- Cloudflare quick tunnels were tried for sharing and died with exit 127 on network timeouts. Use Netlify.

## History

- 9 Aug 2026: planned (registry-driven UI from day one), built, Supabase linked and migration applied, anonymous auth enabled, Netlify site created, GitHub repo created and linked for continuous deploy. Vitest pinned to 3.2.4 (Vitest 4 failed collecting suites); Vite and Vitest configs split.
- 9 Aug: Dots and Boxes; nickname editing; board sizes (TTT 3/5/7, Dots rows 2–8).
- 11 Aug: Rock Paper Scissors (best of 3/5/7); Memory Match (8/12/18 pairs). Last commit `adf3beb`.
- 25 Aug: paused Supabase project restored.
- 28 Aug: auth refresh hang fixed and deployed to production with the Netlify CLI.

## Pending actions (open as of 28 Oct 2026)

Confirm each with the user and remove it from this list when done.

1. **Commit and push the auth fix** (details under "Current state" below). Until then, any push to `main` brings the auth hang back.
2. **Rotate tokens.** The Supabase personal access token and the Netlify personal access token were pasted in a chat on 9 Aug 2026. Revoke both in their dashboards, then log in again with the CLIs.
3. **New machine:** recreate `.env` from the values under "Run" (it is git-ignored), then `npm install`.

## Current state (28 Oct 2026)

**The auth fix from 28 Aug is live on Netlify but was never committed.** Uncommitted: modified `src/hooks/usePlayer.ts`, `src/lib/supabase.ts`, `src/pages/CreateGame.tsx`, `src/pages/GameRoom.tsx`, `src/pages/JoinGame.tsx`, `src/services/gameService.ts`; new `src/components/AuthErrorScreen.tsx`, `src/lib/authSession.ts`, `src/lib/authSession.test.ts`. Commit and push these before any other push to `main`, otherwise the next automatic Netlify build will ship the old code and bring the hang back.

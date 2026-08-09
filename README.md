# Game Night

Play quick multiplayer mini-games with friends. Built for low cost: React + Vite on Netlify, Supabase (Postgres, Realtime, anonymous auth) as the only backend.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Supabase (PostgreSQL, Realtime, Anonymous Auth)
- Netlify (SPA hosting)

## Local setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Enable Anonymous sign-ins**  
   Authentication → Providers → Anonymous → Enable.

3. **Run the migration**  
   In the SQL Editor, paste and run  
   [`supabase/migrations/20260809100000_init_game_night.sql`](supabase/migrations/20260809100000_init_game_night.sql).

4. **Copy env vars**

   ```bash
   cp .env.example .env
   ```

   Set:

   - `VITE_SUPABASE_URL` — Project URL  
   - `VITE_SUPABASE_ANON_KEY` — anon/public key  

   Never put the service-role key in the frontend.

5. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

6. **Tests**

   ```bash
   npm test
   ```

## Deploy to Netlify

1. Push this repo to GitHub.
2. New Netlify site → import the repo.
3. Build command: `npm run build` · Publish directory: `dist`  
   (`netlify.toml` already configures SPA redirects so `/game/ABC123` works on refresh.)
4. Site settings → Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## Adding a new game

The room UI is registry-driven. To add a game (e.g. Connect Four):

1. Create `src/games/<id>/` with:
   - `gameLogic.ts` (pure, testable)
   - `Board.tsx` implementing `GameBoardProps`
   - `index.ts` exporting a `GameDefinition`
2. Register it in [`src/games/registry.ts`](src/games/registry.ts) with `status: 'available'`.
3. Extend the SQL helpers/RPCs in a new migration:
   - `initial_board_for_game`
   - `first_seat_for_game` / `next_seat_for_game` / `max_players_for_game`
   - a branch in `make_move` for the new `game_type`
4. Home catalog and Create picker pick it up automatically. `GameRoom` renders `definition.Board`.

Coming-soon stubs can use `status: 'coming_soon'` without a real Board.

## Project layout

```
src/
  components/     # shared + room chrome
  games/          # registry + per-game plugins
  hooks/          # player, room, realtime
  lib/            # supabase client
  pages/          # routes
  services/       # RPC wrappers
  utils/
supabase/migrations/
```

## Security model

- Clients only use the anon key.
- Game mutations go through Postgres RPCs (`create_game`, `join_game`, `make_move`, `request_rematch`, `leave_game`).
- RLS blocks direct writes to `games` / `game_players`.
- Move legality is enforced in the database, not the React client.

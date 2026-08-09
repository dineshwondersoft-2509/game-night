-- Game Night: schema, RLS, and authoritative RPCs

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  game_type text not null,
  status text not null check (status in ('waiting', 'active', 'finished', 'abandoned')),
  board jsonb not null default '[]'::jsonb,
  current_turn text,
  winner text,
  rematch_requests jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  symbol text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (game_id, player_id),
  unique (game_id, symbol)
);

create index games_room_code_idx on public.games (room_code);
create index game_players_game_id_idx on public.game_players (game_id);
create index game_players_player_id_idx on public.game_players (player_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

create or replace function public.generate_room_code(length int default 6)
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..length loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.ttt_check_winner(board jsonb)
returns text
language plpgsql
immutable
as $$
declare
  lines int[][] := array[
    array[0,1,2],
    array[3,4,5],
    array[6,7,8],
    array[0,3,6],
    array[1,4,7],
    array[2,5,8],
    array[0,4,8],
    array[2,4,6]
  ];
  line int[];
  a text;
  b text;
  c text;
  i int;
  filled int := 0;
begin
  foreach line slice 1 in array lines loop
    a := board ->> line[1];
    b := board ->> line[2];
    c := board ->> line[3];
    if a is not null and a = b and b = c then
      return a;
    end if;
  end loop;

  for i in 0..8 loop
    if board ->> i is not null then
      filled := filled + 1;
    end if;
  end loop;

  if filled = 9 then
    return 'draw';
  end if;

  return null;
end;
$$;

create or replace function public.is_game_member(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_players gp
    where gp.game_id = p_game_id
      and gp.player_id = auth.uid()
  );
$$;

create or replace function public.initial_board_for_game(p_game_type text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if p_game_type = 'tic-tac-toe' then
    return '[null,null,null,null,null,null,null,null,null]'::jsonb;
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

create or replace function public.first_seat_for_game(p_game_type text)
returns text
language plpgsql
immutable
as $$
begin
  if p_game_type = 'tic-tac-toe' then
    return 'X';
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

create or replace function public.next_seat_for_game(p_game_type text, p_existing text[])
returns text
language plpgsql
immutable
as $$
begin
  if p_game_type = 'tic-tac-toe' then
    if not ('X' = any (p_existing)) then
      return 'X';
    end if;
    if not ('O' = any (p_existing)) then
      return 'O';
    end if;
    raise exception 'Room is full';
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

create or replace function public.max_players_for_game(p_game_type text)
returns int
language plpgsql
immutable
as $$
begin
  if p_game_type = 'tic-tac-toe' then
    return 2;
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

-- Normalize empty strings to JSON nulls for tic-tac-toe board cells
create or replace function public.ttt_normalize_board(board jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '[]'::jsonb;
  i int;
  cell text;
begin
  for i in 0..8 loop
    cell := board ->> i;
    if cell is null or cell = '' then
      result := result || 'null'::jsonb;
    else
      result := result || to_jsonb(cell);
    end if;
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_game(p_game_type text, p_nickname text)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_game public.games;
  v_attempts int := 0;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_game_type is distinct from 'tic-tac-toe' then
    raise exception 'Unsupported game type';
  end if;

  if p_nickname is null or char_length(trim(p_nickname)) < 1 then
    raise exception 'Nickname required';
  end if;

  loop
    v_code := public.generate_room_code(6);
    begin
      insert into public.games (room_code, game_type, status, board, current_turn, winner, rematch_requests)
      values (
        v_code,
        p_game_type,
        'waiting',
        public.initial_board_for_game(p_game_type),
        public.first_seat_for_game(p_game_type),
        null,
        '{}'::jsonb
      )
      returning * into v_game;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 8 then
        raise;
      end if;
    end;
  end loop;

  insert into public.game_players (game_id, player_id, nickname, symbol)
  values (v_game.id, v_user, trim(p_nickname), public.first_seat_for_game(p_game_type));

  return v_game;
end;
$$;

create or replace function public.join_game(p_room_code text, p_nickname text)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_count int;
  v_existing text[];
  v_symbol text;
  v_max int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_nickname is null or char_length(trim(p_nickname)) < 1 then
    raise exception 'Nickname required';
  end if;

  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code))
  for update;

  if v_game is null then
    raise exception 'Game not found';
  end if;

  if v_game.status = 'abandoned' then
    raise exception 'Game expired';
  end if;

  if exists (
    select 1 from public.game_players
    where game_id = v_game.id and player_id = v_user
  ) then
    update public.game_players
    set nickname = trim(p_nickname), last_seen_at = now()
    where game_id = v_game.id and player_id = v_user;
    return v_game;
  end if;

  select count(*) into v_count from public.game_players where game_id = v_game.id;
  v_max := public.max_players_for_game(v_game.game_type);

  if v_count >= v_max or v_game.status not in ('waiting') then
    raise exception 'Room is full';
  end if;

  select coalesce(array_agg(symbol), array[]::text[]) into v_existing
  from public.game_players
  where game_id = v_game.id;

  v_symbol := public.next_seat_for_game(v_game.game_type, v_existing);

  insert into public.game_players (game_id, player_id, nickname, symbol)
  values (v_game.id, v_user, trim(p_nickname), v_symbol);

  select count(*) into v_count from public.game_players where game_id = v_game.id;

  if v_count >= v_max then
    update public.games
    set status = 'active', updated_at = now()
    where id = v_game.id
    returning * into v_game;
  end if;

  return v_game;
end;
$$;

create or replace function public.make_move(p_room_code text, p_move jsonb)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_player public.game_players;
  v_board jsonb;
  v_pos int;
  v_cell text;
  v_winner text;
  v_next text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code))
  for update;

  if v_game is null then
    raise exception 'Game not found';
  end if;

  if v_game.status is distinct from 'active' then
    raise exception 'Game is not active';
  end if;

  select * into v_player
  from public.game_players
  where game_id = v_game.id and player_id = v_user;

  if v_player is null then
    raise exception 'Not a player in this room';
  end if;

  if v_player.symbol is distinct from v_game.current_turn then
    raise exception 'Not your turn';
  end if;

  if v_game.game_type = 'tic-tac-toe' then
    v_pos := (p_move ->> 'position')::int;
    if v_pos is null or v_pos < 0 or v_pos > 8 then
      raise exception 'Invalid move';
    end if;

    v_board := public.ttt_normalize_board(v_game.board);
    v_cell := v_board ->> v_pos;
    if v_cell is not null and v_cell <> 'null' and v_cell <> '' then
      raise exception 'Cell occupied';
    end if;

    v_board := jsonb_set(v_board, array[v_pos::text], to_jsonb(v_player.symbol), true);
    v_winner := public.ttt_check_winner(v_board);

    if v_winner is not null then
      update public.games
      set
        board = v_board,
        winner = v_winner,
        status = 'finished',
        current_turn = null,
        rematch_requests = '{}'::jsonb,
        updated_at = now()
      where id = v_game.id
      returning * into v_game;
    else
      v_next := case when v_game.current_turn = 'X' then 'O' else 'X' end;
      update public.games
      set
        board = v_board,
        current_turn = v_next,
        updated_at = now()
      where id = v_game.id
      returning * into v_game;
    end if;
  else
    raise exception 'Unsupported game type';
  end if;

  update public.game_players
  set last_seen_at = now()
  where id = v_player.id;

  return v_game;
end;
$$;

create or replace function public.request_rematch(p_room_code text)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_player public.game_players;
  v_requests jsonb;
  v_pending int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code))
  for update;

  if v_game is null then
    raise exception 'Game not found';
  end if;

  if v_game.status is distinct from 'finished' then
    raise exception 'Game is not finished';
  end if;

  select * into v_player
  from public.game_players
  where game_id = v_game.id and player_id = v_user;

  if v_player is null then
    raise exception 'Not a player in this room';
  end if;

  v_requests := coalesce(v_game.rematch_requests, '{}'::jsonb);
  v_requests := jsonb_set(v_requests, array[v_player.symbol], 'true'::jsonb, true);

  select count(*) into v_pending
  from public.game_players gp
  where gp.game_id = v_game.id
    and coalesce((v_requests ->> gp.symbol)::boolean, false) is not true;

  if v_pending = 0
     and (select count(*) from public.game_players where game_id = v_game.id)
         >= public.max_players_for_game(v_game.game_type) then
    update public.games
    set
      board = public.initial_board_for_game(v_game.game_type),
      current_turn = public.first_seat_for_game(v_game.game_type),
      winner = null,
      status = 'active',
      rematch_requests = '{}'::jsonb,
      updated_at = now()
    where id = v_game.id
    returning * into v_game;
  else
    update public.games
    set rematch_requests = v_requests, updated_at = now()
    where id = v_game.id
    returning * into v_game;
  end if;

  return v_game;
end;
$$;

create or replace function public.leave_game(p_room_code text)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code))
  for update;

  if v_game is null then
    raise exception 'Game not found';
  end if;

  delete from public.game_players
  where game_id = v_game.id and player_id = v_user;

  update public.games
  set status = 'abandoned', updated_at = now()
  where id = v_game.id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.heartbeat(p_room_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game_id uuid;
begin
  if v_user is null then
    return;
  end if;

  select id into v_game_id
  from public.games
  where room_code = upper(trim(p_room_code));

  if v_game_id is null then
    return;
  end if;

  update public.game_players
  set last_seen_at = now()
  where game_id = v_game_id and player_id = v_user;
end;
$$;

create or replace function public.get_game_by_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_players jsonb;
begin
  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code));

  if v_game is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', gp.id,
    'playerId', gp.player_id,
    'nickname', gp.nickname,
    'symbol', gp.symbol,
    'joinedAt', gp.joined_at,
    'lastSeenAt', gp.last_seen_at
  ) order by gp.joined_at), '[]'::jsonb)
  into v_players
  from public.game_players gp
  where gp.game_id = v_game.id;

  return jsonb_build_object(
    'game', to_jsonb(v_game),
    'players', v_players
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.games enable row level security;
alter table public.game_players enable row level security;

create policy "Members can read games"
  on public.games
  for select
  to authenticated
  using (
    public.is_game_member(id)
    or status = 'waiting'
  );

create policy "Members can read players"
  on public.game_players
  for select
  to authenticated
  using (
    public.is_game_member(game_id)
    or exists (
      select 1 from public.games g
      where g.id = game_id and g.status = 'waiting'
    )
  );

-- No direct insert/update/delete policies — mutations via RPCs only.

grant usage on schema public to anon, authenticated;
grant select on public.games to authenticated;
grant select on public.game_players to authenticated;

grant execute on function public.create_game(text, text) to authenticated;
grant execute on function public.join_game(text, text) to authenticated;
grant execute on function public.make_move(text, jsonb) to authenticated;
grant execute on function public.request_rematch(text) to authenticated;
grant execute on function public.leave_game(text) to authenticated;
grant execute on function public.heartbeat(text) to authenticated;
grant execute on function public.get_game_by_room(text) to authenticated;

-- Realtime
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;

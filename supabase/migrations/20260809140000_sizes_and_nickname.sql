-- Size options (TTT 3/5/7, DAB 2–8) + update nickname

drop function if exists public.create_game(text, text);

create or replace function public.ttt_initial_board(size int default 3)
returns jsonb
language plpgsql
immutable
as $$
declare
  cells jsonb := '[]'::jsonb;
  i int;
  n int := size;
begin
  if n not in (3, 5, 7) then
    raise exception 'Invalid size';
  end if;
  for i in 1..(n * n) loop
    cells := cells || 'null'::jsonb;
  end loop;
  return jsonb_build_object('size', n, 'cells', cells);
end;
$$;

create or replace function public.ttt_check_winner_sized(board jsonb)
returns text
language plpgsql
immutable
as $$
declare
  size int := coalesce((board ->> 'size')::int, 3);
  cells jsonb := coalesce(board -> 'cells', '[]'::jsonb);
  r int;
  c int;
  i int;
  first text;
  ok boolean;
  filled int := 0;
  cell text;
begin
  -- rows
  for r in 0..size - 1 loop
    first := nullif(nullif(cells ->> (r * size), ''), 'null');
    if first is not null then
      ok := true;
      for c in 1..size - 1 loop
        if nullif(nullif(cells ->> (r * size + c), ''), 'null') is distinct from first then
          ok := false;
          exit;
        end if;
      end loop;
      if ok then
        return first;
      end if;
    end if;
  end loop;

  -- cols
  for c in 0..size - 1 loop
    first := nullif(nullif(cells ->> c, ''), 'null');
    if first is not null then
      ok := true;
      for r in 1..size - 1 loop
        if nullif(nullif(cells ->> (r * size + c), ''), 'null') is distinct from first then
          ok := false;
          exit;
        end if;
      end loop;
      if ok then
        return first;
      end if;
    end if;
  end loop;

  -- main diagonal
  first := nullif(nullif(cells ->> 0, ''), 'null');
  if first is not null then
    ok := true;
    for i in 1..size - 1 loop
      if nullif(nullif(cells ->> (i * size + i), ''), 'null') is distinct from first then
        ok := false;
        exit;
      end if;
    end loop;
    if ok then
      return first;
    end if;
  end if;

  -- anti diagonal
  first := nullif(nullif(cells ->> (size - 1), ''), 'null');
  if first is not null then
    ok := true;
    for i in 1..size - 1 loop
      if nullif(nullif(cells ->> (i * size + (size - 1 - i)), ''), 'null') is distinct from first then
        ok := false;
        exit;
      end if;
    end loop;
    if ok then
      return first;
    end if;
  end if;

  for i in 0..(size * size - 1) loop
    cell := nullif(nullif(cells ->> i, ''), 'null');
    if cell is not null then
      filled := filled + 1;
    end if;
  end loop;

  if filled = size * size then
    return 'draw';
  end if;

  return null;
end;
$$;

create or replace function public.board_size_from_state(p_game_type text, board jsonb)
returns int
language plpgsql
immutable
as $$
declare
  size int;
begin
  size := coalesce((board ->> 'size')::int, null);
  if p_game_type = 'tic-tac-toe' then
    if size in (3, 5, 7) then
      return size;
    end if;
    -- legacy flat array
    if jsonb_typeof(board) = 'array' and jsonb_array_length(board) = 9 then
      return 3;
    end if;
    return 3;
  end if;
  if p_game_type = 'dots-and-boxes' then
    if size is null then
      return 3;
    end if;
    if size < 2 or size > 8 then
      return 3;
    end if;
    return size;
  end if;
  return 3;
end;
$$;

create or replace function public.initial_board_for_game(p_game_type text, p_size int default null)
returns jsonb
language plpgsql
immutable
as $$
declare
  size int;
begin
  if p_game_type = 'tic-tac-toe' then
    size := coalesce(p_size, 3);
    if size not in (3, 5, 7) then
      raise exception 'Invalid size';
    end if;
    return public.ttt_initial_board(size);
  end if;
  if p_game_type = 'dots-and-boxes' then
    size := coalesce(p_size, 3);
    if size < 2 or size > 8 then
      raise exception 'Invalid size';
    end if;
    return public.dab_initial_board(size);
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

-- Keep single-arg overload working for rematch helpers that only pass type
create or replace function public.initial_board_for_game(p_game_type text)
returns jsonb
language sql
immutable
as $$
  select public.initial_board_for_game(p_game_type, null);
$$;

create or replace function public.create_game(p_game_type text, p_nickname text, p_options jsonb default '{}'::jsonb)
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
  v_size int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_game_type not in ('tic-tac-toe', 'dots-and-boxes') then
    raise exception 'Unsupported game type';
  end if;

  if p_nickname is null or char_length(trim(p_nickname)) < 1 then
    raise exception 'Nickname required';
  end if;

  v_size := nullif(p_options ->> 'size', '')::int;

  loop
    v_code := public.generate_room_code(6);
    begin
      insert into public.games (room_code, game_type, status, board, current_turn, winner, rematch_requests)
      values (
        v_code,
        p_game_type,
        'waiting',
        public.initial_board_for_game(p_game_type, v_size),
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

create or replace function public.update_nickname(p_room_code text, p_nickname text)
returns public.game_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_game_id uuid;
  v_player public.game_players;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_nickname is null or char_length(trim(p_nickname)) < 1 then
    raise exception 'Nickname required';
  end if;

  select id into v_game_id
  from public.games
  where room_code = upper(trim(p_room_code));

  if v_game_id is null then
    raise exception 'Game not found';
  end if;

  update public.game_players
  set nickname = trim(p_nickname), last_seen_at = now()
  where game_id = v_game_id and player_id = v_user
  returning * into v_player;

  if v_player is null then
    raise exception 'Not a player in this room';
  end if;

  return v_player;
end;
$$;

grant execute on function public.update_nickname(text, text) to authenticated;
grant execute on function public.create_game(text, text, jsonb) to authenticated;

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
  v_cells jsonb;
  v_size int;
  v_pos int;
  v_cell text;
  v_winner text;
  v_next text;
  v_orient text;
  v_idx int;
  v_before jsonb;
  v_claimed int;
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
    -- normalize legacy array boards into {size,cells}
    if jsonb_typeof(v_game.board) = 'array' then
      v_board := jsonb_build_object('size', 3, 'cells', public.ttt_normalize_board(v_game.board));
    else
      v_board := v_game.board;
    end if;

    v_size := coalesce((v_board ->> 'size')::int, 3);
    v_cells := coalesce(v_board -> 'cells', '[]'::jsonb);

    if v_pos is null or v_pos < 0 or v_pos >= v_size * v_size then
      raise exception 'Invalid move';
    end if;

    v_cell := nullif(nullif(v_cells ->> v_pos, ''), 'null');
    if v_cell is not null then
      raise exception 'Cell occupied';
    end if;

    v_cells := jsonb_set(v_cells, array[v_pos::text], to_jsonb(v_player.symbol), true);
    v_board := jsonb_build_object('size', v_size, 'cells', v_cells);
    v_winner := public.ttt_check_winner_sized(v_board);

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

  elsif v_game.game_type = 'dots-and-boxes' then
    v_orient := p_move ->> 'orient';
    v_idx := (p_move ->> 'index')::int;
    v_before := v_game.board;
    v_board := public.dab_apply_move(v_before, v_orient, v_idx, v_player.symbol);
    v_claimed := public.dab_claimed_count(v_before, v_board);
    v_winner := public.dab_check_winner(v_board);

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
      if v_claimed > 0 then
        v_next := v_game.current_turn;
      else
        v_next := case when v_game.current_turn = 'A' then 'B' else 'A' end;
      end if;

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
  v_size int;
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
    v_size := public.board_size_from_state(v_game.game_type, v_game.board);
    update public.games
    set
      board = public.initial_board_for_game(v_game.game_type, v_size),
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

-- Add Dots and Boxes support to Game Night RPCs

create or replace function public.dab_initial_board(size int default 3)
returns jsonb
language plpgsql
immutable
as $$
declare
  h_count int := size * (size + 1);
  v_count int := size * (size + 1);
  box_count int := size * size;
  h jsonb := '[]'::jsonb;
  v jsonb := '[]'::jsonb;
  boxes jsonb := '[]'::jsonb;
  i int;
begin
  for i in 1..h_count loop
    h := h || 'null'::jsonb;
  end loop;
  for i in 1..v_count loop
    v := v || 'null'::jsonb;
  end loop;
  for i in 1..box_count loop
    boxes := boxes || 'null'::jsonb;
  end loop;

  return jsonb_build_object(
    'size', size,
    'h', h,
    'v', v,
    'boxes', boxes
  );
end;
$$;

create or replace function public.dab_line_value(arr jsonb, idx int)
returns text
language sql
immutable
as $$
  select nullif(nullif(arr ->> idx, ''), 'null');
$$;

create or replace function public.dab_box_complete(board jsonb, box_index int)
returns boolean
language plpgsql
immutable
as $$
declare
  size int := coalesce((board ->> 'size')::int, 3);
  row int := box_index / size;
  col int := box_index % size;
  top text;
  bottom text;
  left_line text;
  right_line text;
begin
  top := public.dab_line_value(board -> 'h', row * size + col);
  bottom := public.dab_line_value(board -> 'h', (row + 1) * size + col);
  left_line := public.dab_line_value(board -> 'v', row * (size + 1) + col);
  right_line := public.dab_line_value(board -> 'v', row * (size + 1) + col + 1);
  return top is not null and bottom is not null and left_line is not null and right_line is not null;
end;
$$;

create or replace function public.dab_apply_move(board jsonb, orient text, idx int, seat text)
returns jsonb
language plpgsql
immutable
as $$
declare
  size int := coalesce((board ->> 'size')::int, 3);
  h jsonb := coalesce(board -> 'h', '[]'::jsonb);
  v jsonb := coalesce(board -> 'v', '[]'::jsonb);
  boxes jsonb := coalesce(board -> 'boxes', '[]'::jsonb);
  h_count int := size * (size + 1);
  v_count int := size * (size + 1);
  box_count int := size * size;
  existing text;
  next_board jsonb;
  i int;
  owner text;
begin
  if orient not in ('h', 'v') then
    raise exception 'Invalid move';
  end if;

  if orient = 'h' then
    if idx < 0 or idx >= h_count then
      raise exception 'Invalid move';
    end if;
    existing := public.dab_line_value(h, idx);
    if existing is not null then
      raise exception 'Line occupied';
    end if;
    h := jsonb_set(h, array[idx::text], to_jsonb(seat), true);
  else
    if idx < 0 or idx >= v_count then
      raise exception 'Invalid move';
    end if;
    existing := public.dab_line_value(v, idx);
    if existing is not null then
      raise exception 'Line occupied';
    end if;
    v := jsonb_set(v, array[idx::text], to_jsonb(seat), true);
  end if;

  next_board := jsonb_build_object('size', size, 'h', h, 'v', v, 'boxes', boxes);

  for i in 0..box_count - 1 loop
    owner := public.dab_line_value(boxes, i);
    if owner is null and public.dab_box_complete(next_board, i) then
      boxes := jsonb_set(boxes, array[i::text], to_jsonb(seat), true);
    end if;
  end loop;

  return jsonb_build_object('size', size, 'h', h, 'v', v, 'boxes', boxes);
end;
$$;

create or replace function public.dab_claimed_count(before_board jsonb, after_board jsonb)
returns int
language plpgsql
immutable
as $$
declare
  size int := coalesce((after_board ->> 'size')::int, 3);
  box_count int := size * size;
  i int;
  claimed int := 0;
begin
  for i in 0..box_count - 1 loop
    if public.dab_line_value(before_board -> 'boxes', i) is null
       and public.dab_line_value(after_board -> 'boxes', i) is not null then
      claimed := claimed + 1;
    end if;
  end loop;
  return claimed;
end;
$$;

create or replace function public.dab_check_winner(board jsonb)
returns text
language plpgsql
immutable
as $$
declare
  size int := coalesce((board ->> 'size')::int, 3);
  box_count int := size * size;
  i int;
  owner text;
  a_count int := 0;
  b_count int := 0;
begin
  for i in 0..box_count - 1 loop
    owner := public.dab_line_value(board -> 'boxes', i);
    if owner is null then
      return null;
    elsif owner = 'A' then
      a_count := a_count + 1;
    elsif owner = 'B' then
      b_count := b_count + 1;
    end if;
  end loop;

  if a_count = b_count then
    return 'draw';
  elsif a_count > b_count then
    return 'A';
  else
    return 'B';
  end if;
end;
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
  if p_game_type = 'dots-and-boxes' then
    return public.dab_initial_board(3);
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
  if p_game_type = 'dots-and-boxes' then
    return 'A';
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
  if p_game_type = 'dots-and-boxes' then
    if not ('A' = any (p_existing)) then
      return 'A';
    end if;
    if not ('B' = any (p_existing)) then
      return 'B';
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
  if p_game_type in ('tic-tac-toe', 'dots-and-boxes') then
    return 2;
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

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

  if p_game_type not in ('tic-tac-toe', 'dots-and-boxes') then
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

-- Memory Match multiplayer

create or replace function public.mem_layout(pairs int, out cols int, out rows int)
language plpgsql
immutable
as $$
begin
  if pairs = 8 then
    cols := 4; rows := 4;
  elsif pairs = 12 then
    cols := 4; rows := 6;
  elsif pairs = 18 then
    cols := 6; rows := 6;
  else
    raise exception 'Invalid size';
  end if;
end;
$$;

create or replace function public.mem_initial_board(pairs int default 8)
returns jsonb
language plpgsql
volatile
as $$
declare
  n int := pairs;
  cols int;
  rows int;
  symbols text[] := array[
    '🐶','🐱','🦊','🐼','🦁','🐸',
    '🐵','🦄','🐝','🦋','🐙','🦉',
    '🐧','🐢','🐬','🌸','🔥','⭐'
  ];
  cards jsonb := '[]'::jsonb;
  i int;
  j int;
  tmp jsonb;
  arr jsonb[];
  len int;
begin
  if n not in (8, 12, 18) then
    raise exception 'Invalid size';
  end if;

  select * into cols, rows from public.mem_layout(n);

  for i in 0..n - 1 loop
    cards := cards || jsonb_build_object(
      'pairId', i,
      'symbol', symbols[i + 1],
      'matchedBy', null
    );
    cards := cards || jsonb_build_object(
      'pairId', i,
      'symbol', symbols[i + 1],
      'matchedBy', null
    );
  end loop;

  len := jsonb_array_length(cards);
  arr := array(select value from jsonb_array_elements(cards));
  for i in reverse len - 1 .. 1 loop
    j := floor(random() * (i + 1))::int;
    tmp := arr[i + 1];
    arr[i + 1] := arr[j + 1];
    arr[j + 1] := tmp;
  end loop;

  cards := to_jsonb(arr);

  return jsonb_build_object(
    'pairs', n,
    'cols', cols,
    'rows', rows,
    'cards', cards,
    'flipped', '[]'::jsonb,
    'scoreA', 0,
    'scoreB', 0,
    'lastReveal', null
  );
end;
$$;

create or replace function public.mem_is_finished(board jsonb)
returns boolean
language sql
immutable
as $$
  select not exists (
    select 1
    from jsonb_array_elements(coalesce(board -> 'cards', '[]'::jsonb)) c
    where nullif(c ->> 'matchedBy', '') is null
  )
  and jsonb_array_length(coalesce(board -> 'cards', '[]'::jsonb)) > 0;
$$;

create or replace function public.mem_check_winner(board jsonb)
returns text
language plpgsql
immutable
as $$
declare
  score_a int := coalesce((board ->> 'scoreA')::int, 0);
  score_b int := coalesce((board ->> 'scoreB')::int, 0);
begin
  if not public.mem_is_finished(board) then
    return null;
  end if;
  if score_a = score_b then
    return 'draw';
  elsif score_a > score_b then
    return 'A';
  else
    return 'B';
  end if;
end;
$$;

create or replace function public.mem_apply_flip(board jsonb, seat text, idx int)
returns jsonb
language plpgsql
immutable
as $$
declare
  cards jsonb := coalesce(board -> 'cards', '[]'::jsonb);
  flipped jsonb := coalesce(board -> 'flipped', '[]'::jsonb);
  flip_count int := jsonb_array_length(flipped);
  score_a int := coalesce((board ->> 'scoreA')::int, 0);
  score_b int := coalesce((board ->> 'scoreB')::int, 0);
  card jsonb;
  matched_by text;
  a int;
  b int;
  pair_a int;
  pair_b int;
  matched boolean;
begin
  if seat not in ('A', 'B') then
    raise exception 'Invalid move';
  end if;
  if idx is null or idx < 0 or idx >= jsonb_array_length(cards) then
    raise exception 'Invalid move';
  end if;
  if flip_count >= 2 then
    raise exception 'Invalid move';
  end if;

  for a in 0..greatest(flip_count - 1, -1) loop
    if flip_count > 0 and (flipped ->> a)::int = idx then
      raise exception 'Invalid move';
    end if;
  end loop;

  card := cards -> idx;
  matched_by := nullif(card ->> 'matchedBy', '');
  if matched_by is not null then
    raise exception 'Card matched';
  end if;

  flipped := flipped || to_jsonb(idx);

  if jsonb_array_length(flipped) = 1 then
    return jsonb_build_object(
      'pairs', (board ->> 'pairs')::int,
      'cols', (board ->> 'cols')::int,
      'rows', (board ->> 'rows')::int,
      'cards', cards,
      'flipped', flipped,
      'scoreA', score_a,
      'scoreB', score_b,
      'lastReveal', null,
      'keepTurn', true,
      'nextTurn', seat
    );
  end if;

  a := (flipped ->> 0)::int;
  b := (flipped ->> 1)::int;
  pair_a := (cards -> a ->> 'pairId')::int;
  pair_b := (cards -> b ->> 'pairId')::int;
  matched := pair_a = pair_b;

  if matched then
    cards := jsonb_set(cards, array[a::text, 'matchedBy'], to_jsonb(seat), true);
    cards := jsonb_set(cards, array[b::text, 'matchedBy'], to_jsonb(seat), true);
    if seat = 'A' then score_a := score_a + 1; else score_b := score_b + 1; end if;
    return jsonb_build_object(
      'pairs', (board ->> 'pairs')::int,
      'cols', (board ->> 'cols')::int,
      'rows', (board ->> 'rows')::int,
      'cards', cards,
      'flipped', '[]'::jsonb,
      'scoreA', score_a,
      'scoreB', score_b,
      'lastReveal', jsonb_build_object(
        'indices', jsonb_build_array(a, b),
        'matched', true,
        'by', seat
      ),
      'keepTurn', true,
      'nextTurn', seat
    );
  end if;

  return jsonb_build_object(
    'pairs', (board ->> 'pairs')::int,
    'cols', (board ->> 'cols')::int,
    'rows', (board ->> 'rows')::int,
    'cards', cards,
    'flipped', '[]'::jsonb,
    'scoreA', score_a,
    'scoreB', score_b,
    'lastReveal', jsonb_build_object(
      'indices', jsonb_build_array(a, b),
      'matched', false,
      'by', seat
    ),
    'keepTurn', false,
    'nextTurn', case when seat = 'A' then 'B' else 'A' end
  );
end;
$$;

create or replace function public.initial_board_for_game(p_game_type text, p_size int default null)
returns jsonb
language plpgsql
volatile
as $$
declare
  size int;
begin
  if p_game_type = 'tic-tac-toe' then
    size := coalesce(p_size, 3);
    if size not in (3, 5, 7) then raise exception 'Invalid size'; end if;
    return public.ttt_initial_board(size);
  end if;
  if p_game_type = 'dots-and-boxes' then
    size := coalesce(p_size, 3);
    if size < 2 or size > 8 then raise exception 'Invalid size'; end if;
    return public.dab_initial_board(size);
  end if;
  if p_game_type = 'rock-paper-scissors' then
    size := coalesce(p_size, 3);
    if size not in (3, 5, 7) then raise exception 'Invalid size'; end if;
    return public.rps_initial_board(size);
  end if;
  if p_game_type = 'memory-match' then
    size := coalesce(p_size, 8);
    if size not in (8, 12, 18) then raise exception 'Invalid size'; end if;
    return public.mem_initial_board(size);
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
end;
$$;

create or replace function public.initial_board_for_game(p_game_type text)
returns jsonb
language sql
volatile
as $$
  select public.initial_board_for_game(p_game_type, null);
$$;

create or replace function public.first_seat_for_game(p_game_type text)
returns text
language plpgsql
immutable
as $$
begin
  if p_game_type = 'tic-tac-toe' then return 'X'; end if;
  if p_game_type in ('dots-and-boxes', 'rock-paper-scissors', 'memory-match') then return 'A'; end if;
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
    if not ('X' = any (p_existing)) then return 'X'; end if;
    if not ('O' = any (p_existing)) then return 'O'; end if;
    raise exception 'Room is full';
  end if;
  if p_game_type in ('dots-and-boxes', 'rock-paper-scissors', 'memory-match') then
    if not ('A' = any (p_existing)) then return 'A'; end if;
    if not ('B' = any (p_existing)) then return 'B'; end if;
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
  if p_game_type in ('tic-tac-toe', 'dots-and-boxes', 'rock-paper-scissors', 'memory-match') then
    return 2;
  end if;
  raise exception 'Unsupported game type: %', p_game_type;
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
  if p_game_type = 'rock-paper-scissors' then
    size := coalesce((board ->> 'bestOf')::int, 3);
    if size in (3, 5, 7) then return size; end if;
    return 3;
  end if;
  if p_game_type = 'memory-match' then
    size := coalesce((board ->> 'pairs')::int, 8);
    if size in (8, 12, 18) then return size; end if;
    return 8;
  end if;
  size := coalesce((board ->> 'size')::int, null);
  if p_game_type = 'tic-tac-toe' then
    if size in (3, 5, 7) then return size; end if;
    if jsonb_typeof(board) = 'array' and jsonb_array_length(board) = 9 then return 3; end if;
    return 3;
  end if;
  if p_game_type = 'dots-and-boxes' then
    if size is null then return 3; end if;
    if size < 2 or size > 8 then return 3; end if;
    return size;
  end if;
  return 3;
end;
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
  v_turn text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_game_type not in ('tic-tac-toe', 'dots-and-boxes', 'rock-paper-scissors', 'memory-match') then
    raise exception 'Unsupported game type';
  end if;
  if p_nickname is null or char_length(trim(p_nickname)) < 1 then
    raise exception 'Nickname required';
  end if;

  v_size := nullif(p_options ->> 'size', '')::int;
  v_turn := case
    when p_game_type = 'rock-paper-scissors' then null
    else public.first_seat_for_game(p_game_type)
  end;

  loop
    v_code := public.generate_room_code(6);
    begin
      insert into public.games (room_code, game_type, status, board, current_turn, winner, rematch_requests)
      values (
        v_code,
        p_game_type,
        'waiting',
        public.initial_board_for_game(p_game_type, v_size),
        v_turn,
        null,
        '{}'::jsonb
      )
      returning * into v_game;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 8 then raise; end if;
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
  v_choice text;
  v_result jsonb;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select * into v_game from public.games where room_code = upper(trim(p_room_code)) for update;
  if v_game is null then raise exception 'Game not found'; end if;
  if v_game.status is distinct from 'active' then raise exception 'Game is not active'; end if;

  select * into v_player from public.game_players where game_id = v_game.id and player_id = v_user;
  if v_player is null then raise exception 'Not a player in this room'; end if;

  if v_game.game_type = 'memory-match' then
    if v_player.symbol is distinct from v_game.current_turn then
      raise exception 'Not your turn';
    end if;
    v_idx := (p_move ->> 'index')::int;
    v_result := public.mem_apply_flip(v_game.board, v_player.symbol, v_idx);
    v_next := v_result ->> 'nextTurn';
    v_board := v_result - 'keepTurn' - 'nextTurn';
    v_winner := public.mem_check_winner(v_board);

    if v_winner is not null then
      update public.games set
        board = v_board, winner = v_winner, status = 'finished',
        current_turn = null, rematch_requests = '{}'::jsonb, updated_at = now()
      where id = v_game.id returning * into v_game;
    else
      update public.games set
        board = v_board, current_turn = v_next, updated_at = now()
      where id = v_game.id returning * into v_game;
    end if;

  elsif v_game.game_type = 'rock-paper-scissors' then
    v_choice := p_move ->> 'choice';
    v_board := public.rps_apply_choice(v_game.board, v_player.symbol, v_choice);
    v_winner := public.rps_match_winner(v_board);
    if v_winner is not null then
      update public.games set board = v_board, winner = v_winner, status = 'finished',
        current_turn = null, rematch_requests = '{}'::jsonb, updated_at = now()
      where id = v_game.id returning * into v_game;
    else
      update public.games set board = v_board, current_turn = null, updated_at = now()
      where id = v_game.id returning * into v_game;
    end if;

  elsif v_game.game_type = 'tic-tac-toe' then
    if v_player.symbol is distinct from v_game.current_turn then raise exception 'Not your turn'; end if;
    v_pos := (p_move ->> 'position')::int;
    if jsonb_typeof(v_game.board) = 'array' then
      v_board := jsonb_build_object('size', 3, 'cells', public.ttt_normalize_board(v_game.board));
    else
      v_board := v_game.board;
    end if;
    v_size := coalesce((v_board ->> 'size')::int, 3);
    v_cells := coalesce(v_board -> 'cells', '[]'::jsonb);
    if v_pos is null or v_pos < 0 or v_pos >= v_size * v_size then raise exception 'Invalid move'; end if;
    v_cell := nullif(nullif(v_cells ->> v_pos, ''), 'null');
    if v_cell is not null then raise exception 'Cell occupied'; end if;
    v_cells := jsonb_set(v_cells, array[v_pos::text], to_jsonb(v_player.symbol), true);
    v_board := jsonb_build_object('size', v_size, 'cells', v_cells);
    v_winner := public.ttt_check_winner_sized(v_board);
    if v_winner is not null then
      update public.games set board = v_board, winner = v_winner, status = 'finished',
        current_turn = null, rematch_requests = '{}'::jsonb, updated_at = now()
      where id = v_game.id returning * into v_game;
    else
      v_next := case when v_game.current_turn = 'X' then 'O' else 'X' end;
      update public.games set board = v_board, current_turn = v_next, updated_at = now()
      where id = v_game.id returning * into v_game;
    end if;

  elsif v_game.game_type = 'dots-and-boxes' then
    if v_player.symbol is distinct from v_game.current_turn then raise exception 'Not your turn'; end if;
    v_orient := p_move ->> 'orient';
    v_idx := (p_move ->> 'index')::int;
    v_before := v_game.board;
    v_board := public.dab_apply_move(v_before, v_orient, v_idx, v_player.symbol);
    v_claimed := public.dab_claimed_count(v_before, v_board);
    v_winner := public.dab_check_winner(v_board);
    if v_winner is not null then
      update public.games set board = v_board, winner = v_winner, status = 'finished',
        current_turn = null, rematch_requests = '{}'::jsonb, updated_at = now()
      where id = v_game.id returning * into v_game;
    else
      if v_claimed > 0 then v_next := v_game.current_turn;
      else v_next := case when v_game.current_turn = 'A' then 'B' else 'A' end;
      end if;
      update public.games set board = v_board, current_turn = v_next, updated_at = now()
      where id = v_game.id returning * into v_game;
    end if;
  else
    raise exception 'Unsupported game type';
  end if;

  update public.game_players set last_seen_at = now() where id = v_player.id;
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
  v_turn text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_game from public.games where room_code = upper(trim(p_room_code)) for update;
  if v_game is null then raise exception 'Game not found'; end if;
  if v_game.status is distinct from 'finished' then raise exception 'Game is not finished'; end if;
  select * into v_player from public.game_players where game_id = v_game.id and player_id = v_user;
  if v_player is null then raise exception 'Not a player in this room'; end if;

  v_requests := coalesce(v_game.rematch_requests, '{}'::jsonb);
  v_requests := jsonb_set(v_requests, array[v_player.symbol], 'true'::jsonb, true);

  select count(*) into v_pending from public.game_players gp
  where gp.game_id = v_game.id
    and coalesce((v_requests ->> gp.symbol)::boolean, false) is not true;

  if v_pending = 0
     and (select count(*) from public.game_players where game_id = v_game.id)
         >= public.max_players_for_game(v_game.game_type) then
    v_size := public.board_size_from_state(v_game.game_type, v_game.board);
    v_turn := case
      when v_game.game_type = 'rock-paper-scissors' then null
      else public.first_seat_for_game(v_game.game_type)
    end;
    update public.games set
      board = public.initial_board_for_game(v_game.game_type, v_size),
      current_turn = v_turn, winner = null, status = 'active',
      rematch_requests = '{}'::jsonb, updated_at = now()
    where id = v_game.id returning * into v_game;
  else
    update public.games set rematch_requests = v_requests, updated_at = now()
    where id = v_game.id returning * into v_game;
  end if;
  return v_game;
end;
$$;

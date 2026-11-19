-- =====================================================================
-- SAVEPOINT — estrutura do banco de dados
-- Cole TUDO isto no Supabase: menu "SQL Editor" > "New query" > "Run".
-- Pode rodar de novo sem problema: ele não apaga dados existentes.
-- =====================================================================

-- ---------- Perfis (um por usuário) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9._]{3,20}$'),
  display_name text,
  bio text check (char_length(bio) <= 300),
  avatar_color text not null default '#3B4BDB',
  top_games bigint[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Jogos (cópia dos dados do IGDB) ----------
create table if not exists public.games (
  id bigint primary key,               -- id do IGDB
  slug text unique not null,
  name text not null,
  cover_url text,
  release_year int,
  summary text,
  developer text,
  genres text[] not null default '{}',
  platforms text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- Status / nota / review de cada usuário em cada jogo ----------
create table if not exists public.game_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id bigint not null references public.games(id) on delete cascade,
  status text check (status in ('jogando','zerado','abandonado','quero')),
  rating smallint check (rating between 1 and 10),   -- 1 = meia estrela, 10 = 5 estrelas
  review text check (char_length(review) <= 5000),
  has_spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);
create index if not exists game_entries_game_idx on public.game_entries(game_id);
create index if not exists game_entries_updated_idx on public.game_entries(updated_at desc);

-- ---------- Seguir pessoas ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------- Curtidas e comentários em reviews ----------
create table if not exists public.review_likes (
  entry_id bigint not null references public.game_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (entry_id, user_id)
);
create table if not exists public.review_comments (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.game_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- ---------- Comunidade de cada jogo ----------
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('duvida','foto','discussao','amizade')),
  title text not null check (char_length(title) between 3 and 200),
  body text check (char_length(body) <= 5000),
  image_url text,
  has_spoiler boolean not null default false,
  best_reply_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists posts_game_idx on public.posts(game_id, created_at desc);

create table if not exists public.post_replies (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.posts add constraint posts_best_reply_fk
    foreign key (best_reply_id) references public.post_replies(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.post_votes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

-- ---------- Denúncias (moderação) ----------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('post','reply','review','comment','profile')),
  target_id text not null,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

-- ---------- Cria o perfil automaticamente quando alguém se cadastra ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- SEGURANÇA (Row Level Security): todos podem LER, cada um só MEXE no que é seu
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_entries enable row level security;
alter table public.follows enable row level security;
alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;
alter table public.posts enable row level security;
alter table public.post_replies enable row level security;
alter table public.post_votes enable row level security;
alter table public.reports enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','games','game_entries','follows','review_likes','review_comments','posts','post_replies','post_votes']
  loop
    execute format('drop policy if exists "leitura publica" on public.%I', t);
    execute format('create policy "leitura publica" on public.%I for select using (true)', t);
  end loop;
end $$;

drop policy if exists "editar o proprio perfil" on public.profiles;
create policy "editar o proprio perfil" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- game_entries, review_comments, posts, post_replies: dono = user_id
do $$
declare t text;
begin
  foreach t in array array['game_entries','review_comments','posts','post_replies','review_likes','post_votes']
  loop
    execute format('drop policy if exists "criar o proprio" on public.%I', t);
    execute format('create policy "criar o proprio" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "apagar o proprio" on public.%I', t);
    execute format('create policy "apagar o proprio" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
  foreach t in array array['game_entries','posts']
  loop
    execute format('drop policy if exists "editar o proprio" on public.%I', t);
    execute format('create policy "editar o proprio" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

drop policy if exists "seguir" on public.follows;
create policy "seguir" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "deixar de seguir" on public.follows;
create policy "deixar de seguir" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "denunciar" on public.reports;
create policy "denunciar" on public.reports for insert with check (auth.uid() = reporter_id);
-- a tabela "games" só é alterada pelo servidor (chave service_role), por isso não tem política de escrita.

-- =====================================================================
-- FOTOS da comunidade (Storage)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "enviar foto na propria pasta" on storage.objects;
create policy "enviar foto na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "apagar propria foto" on storage.objects;
create policy "apagar propria foto" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

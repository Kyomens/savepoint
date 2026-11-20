-- =====================================================================
-- SAVEPOINT — ATUALIZAÇÃO 02
-- Temas e molduras de perfil, insígnias, Steam e platinas, spoiler com
-- ponto do jogo, chat com imagens/vídeos/figurinhas em tempo real.
-- Rode DEPOIS da atualizacao-01.sql. Pode rodar mais de uma vez.
-- SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- ---------- Perfil ----------
alter table public.profiles add column if not exists profile_theme text not null default 'padrao';
alter table public.profiles add column if not exists avatar_frame text;
alter table public.profiles add column if not exists banner_pos int not null default 50;
alter table public.profiles add column if not exists soundtrack_url text;
alter table public.profiles add column if not exists soundtrack_game_id bigint references public.games(id) on delete set null;

-- ---------- Spoiler: até que ponto do jogo ----------
alter table public.game_entries add column if not exists spoiler_scope text;
alter table public.posts add column if not exists spoiler_scope text;
do $$ begin
  alter table public.game_entries add constraint game_entries_spoiler_scope_len check (char_length(spoiler_scope) <= 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.posts add constraint posts_spoiler_scope_len check (char_length(spoiler_scope) <= 80);
exception when duplicate_object then null; end $$;

-- ---------- Steam ----------
alter table public.games add column if not exists steam_appid int;

-- Contas conectadas (só o servidor grava, para ninguém "fingir" uma conta Steam)
create table if not exists public.linked_accounts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('steam', 'xbox')),
  external_id text not null,
  display_name text,
  linked_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.linked_accounts enable row level security;
drop policy if exists "leitura publica" on public.linked_accounts;
create policy "leitura publica" on public.linked_accounts for select using (true);

-- Platinas verificadas (só o servidor grava)
create table if not exists public.platinums (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id bigint not null references public.games(id) on delete cascade,
  source text not null,
  verified_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
alter table public.platinums enable row level security;
drop policy if exists "leitura publica" on public.platinums;
create policy "leitura publica" on public.platinums for select using (true);

-- ---------- Estatísticas para as insígnias ----------
create or replace function public.user_stats(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reviews', (select count(*) from game_entries where user_id = uid and review is not null),
    'ratings', (select count(*) from game_entries where user_id = uid and rating is not null),
    'completed', (select count(*) from game_entries where user_id = uid and status = 'zerado'),
    'likes_received', (select count(*) from review_likes l join game_entries e on e.id = l.entry_id where e.user_id = uid and l.user_id <> uid),
    'posts', (select count(*) from posts where user_id = uid),
    'replies', (select count(*) from post_replies where user_id = uid),
    'best_answers', (select count(*) from posts p join post_replies r on r.id = p.best_reply_id where r.user_id = uid and p.user_id <> uid),
    'votes_received', (select count(*) from post_votes v join posts p on p.id = v.post_id where p.user_id = uid and v.user_id <> uid),
    'followers', (select count(*) from follows where following_id = uid),
    'platinums', (select count(*) from platinums where user_id = uid)
  );
$$;

-- ---------- Chat: imagens, vídeos, arquivos, GIFs e figurinhas ----------
alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists media_name text;
alter table public.messages alter column body set default '';
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_body_len;
alter table public.messages add constraint messages_body_len check (char_length(body) <= 2000);
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text','image','video','file','gif','sticker'));
alter table public.messages drop constraint if exists messages_has_content;
alter table public.messages add constraint messages_has_content check (char_length(body) > 0 or media_url is not null or media_path is not null);
alter table public.messages drop constraint if exists messages_media_url_https;
alter table public.messages add constraint messages_media_url_https check (media_url is null or media_url ~ '^https://');

-- Mensagens em tempo real
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Figurinhas salvas por cada pessoa
create table if not exists public.stickers (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
alter table public.stickers enable row level security;
drop policy if exists "ver minhas figurinhas" on public.stickers;
create policy "ver minhas figurinhas" on public.stickers for select using (auth.uid() = user_id);
drop policy if exists "salvar figurinha" on public.stickers;
create policy "salvar figurinha" on public.stickers for insert with check (auth.uid() = user_id);
drop policy if exists "apagar figurinha" on public.stickers;
create policy "apagar figurinha" on public.stickers for delete using (auth.uid() = user_id);

-- ---------- Storage ----------
-- Arquivos do chat: PRIVADOS (só quem está na conversa consegue abrir)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 26214400, array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/ogg','audio/wav',
  'application/pdf','application/zip','text/plain'
]) on conflict (id) do nothing;

drop policy if exists "chat: enviar na propria pasta" on storage.objects;
create policy "chat: enviar na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "chat: ver arquivos da conversa" on storage.objects;
create policy "chat: ver arquivos da conversa" on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.messages m
        where m.media_path = storage.objects.name
          and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
      )
    )
  );

-- Figurinhas próprias: públicas (quem recebe precisa ver)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 1048576, array['image/png','image/webp','image/gif','image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "figurinhas: enviar na propria pasta" on storage.objects;
create policy "figurinhas: enviar na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Permissões da API ----------
grant select on public.linked_accounts, public.platinums to anon, authenticated;
grant select, insert, delete on public.stickers to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.user_stats(uuid) to anon, authenticated;

-- Arquivo do chat precisa estar na pasta de quem enviou
alter table public.messages drop constraint if exists messages_media_path_owner;
alter table public.messages add constraint messages_media_path_owner
  check (media_path is null or split_part(media_path, '/', 1) = sender_id::text);

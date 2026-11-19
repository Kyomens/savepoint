-- =====================================================================
-- SAVEPOINT — ATUALIZAÇÃO 01
-- Foto de perfil, capa do perfil, nota da crítica, traduções,
-- ranking do Savepoint e mensagens privadas.
-- Cole TUDO no Supabase: "SQL Editor" > "New query" > "Run".
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- ---------- Perfil: foto e capa ----------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;

-- ---------- Jogos: nota da crítica e arte de fundo ----------
alter table public.games add column if not exists critic_score numeric;
alter table public.games add column if not exists critic_count int;
alter table public.games add column if not exists artwork_url text;

-- ---------- Descrições traduzidas (uma por idioma) ----------
create table if not exists public.game_texts (
  game_id bigint not null references public.games(id) on delete cascade,
  lang text not null,
  summary text,
  updated_at timestamptz not null default now(),
  primary key (game_id, lang)
);
alter table public.game_texts enable row level security;
drop policy if exists "leitura publica" on public.game_texts;
create policy "leitura publica" on public.game_texts for select using (true);
-- (só o servidor grava traduções, com a chave service_role)

-- ---------- Ranking do Savepoint (média das notas da comunidade) ----------
create or replace view public.game_stats with (security_invoker = true) as
select
  g.id, g.slug, g.name, g.cover_url, g.release_year, g.genres, g.platforms, g.critic_score,
  round(avg(e.rating)::numeric / 2, 2) as avg_stars,
  count(e.rating) as ratings_count
from public.games g
join public.game_entries e on e.game_id = g.id and e.rating is not null
group by g.id;

-- ---------- Mensagens privadas (só entre quem se segue mutuamente) ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);
create index if not exists messages_sender_idx on public.messages(sender_id, created_at desc);
alter table public.messages enable row level security;

create or replace function public.is_mutual(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = a and following_id = b)
     and exists (select 1 from follows where follower_id = b and following_id = a);
$$;

drop policy if exists "ver minhas mensagens" on public.messages;
create policy "ver minhas mensagens" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "enviar para amigo mutuo" on public.messages;
create policy "enviar para amigo mutuo" on public.messages for insert
  with check (auth.uid() = sender_id and public.is_mutual(sender_id, recipient_id));

-- Marca como lidas as mensagens que "other" mandou para mim
create or replace function public.mark_read(other uuid)
returns void language sql security definer set search_path = public as $$
  update messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = other and read_at is null;
$$;

-- ---------- Fotos de perfil e capas (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "enviar imagem de perfil na propria pasta" on storage.objects;
create policy "enviar imagem de perfil na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "apagar propria imagem de perfil" on storage.objects;
create policy "apagar propria imagem de perfil" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Permissões da API ----------
grant select on public.game_texts, public.game_stats to anon, authenticated;
grant select, insert on public.messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.mark_read(uuid) to authenticated;
grant execute on function public.is_mutual(uuid, uuid) to authenticated;

-- Assignment 4: create AI captions, publish them in a shared feed, and rate them.
-- Run in Supabase Dashboard > SQL Editor after assignment-3.sql.
-- This turns RLS on for every existing public table, removes old policies, and
-- then grants the minimum access needed by this app.

create table if not exists public.caption_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text,
  humor_style text not null check (humor_style in ('observational', 'absurdist', 'wholesome', 'campus_lore')),
  caption_text text not null check (char_length(caption_text) between 1 and 500),
  upvotes integer not null default 0 check (upvotes >= 0),
  downvotes integer not null default 0 check (downvotes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.caption_generation_details (
  generation_id uuid primary key references public.caption_generations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_text text not null check (char_length(source_text) between 8 and 500),
  prompt_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.caption_generations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (generation_id, user_id)
);

alter table public.caption_generation_details
  alter column source_text drop not null;
alter table public.caption_generation_details
  drop constraint if exists caption_generation_details_source_text_check;
alter table public.caption_generation_details
  add constraint caption_generation_details_source_text_check
  check (source_text is null or char_length(source_text) <= 500);

alter table public.caption_generations
  add column if not exists image_path text;

-- Turn RLS on and clear old policies on all app tables in public. This is
-- important because PostgreSQL combines permissive policies with OR semantics.
do $$
declare
  app_table record;
  old_policy record;
begin
  for app_table in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', app_table.tablename);
    execute format('revoke all on table public.%I from public, anon, authenticated', app_table.tablename);

    for old_policy in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = app_table.tablename
    loop
      execute format('drop policy if exists %I on public.%I', old_policy.policyname, app_table.tablename);
    end loop;
  end loop;
end;
$$;

-- Meme images are private Storage objects. Signed-in users can view them;
-- users can upload and delete only files in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meme-images', 'meme-images', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in users can view meme images" on storage.objects;
create policy "Signed-in users can view meme images"
  on storage.objects for select to authenticated
  using (bucket_id = 'meme-images');

drop policy if exists "Users can upload their own meme images" on storage.objects;
create policy "Users can upload their own meme images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meme-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own meme images" on storage.objects;
create policy "Users can delete their own meme images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meme-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- The old sample archive remains public and read-only. The app feed uses the
-- new caption_generations table below.
revoke all on public.caption_entries from anon;
grant select on public.caption_entries to authenticated;
create policy "Signed-in users can read the caption archive"
  on public.caption_entries for select to authenticated
  using (true);

-- Each user can only read or edit their own profile.
grant select, insert, update on public.profiles to authenticated;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Signed-in users can read published captions and aggregate counts. The owner
-- ID is deliberately not selectable; source text and prompts stay private.
revoke select (id, image_path, humor_style, caption_text, upvotes, downvotes, created_at)
  on public.caption_generations from anon;
grant select (id, image_path, humor_style, caption_text, upvotes, downvotes, created_at)
  on public.caption_generations to authenticated;
create policy "Signed-in users can read generated captions"
  on public.caption_generations for select to authenticated
  using (true);

-- Owners may inspect their own source and prompt, but cannot insert or mutate
-- details directly. New generations are created atomically through an RPC below.
grant select (generation_id, source_text, prompt_text, created_at)
  on public.caption_generation_details to authenticated;
create policy "Users can read their own generation details"
  on public.caption_generation_details for select to authenticated
  using ((select auth.uid()) = user_id);

-- Individual vote records are private to their voter. One vote per user and
-- caption; users can change their own vote, and cannot delete another's.
grant select (id, generation_id, user_id, vote, created_at),
      insert (generation_id, user_id, vote),
      update (vote)
  on public.caption_votes to authenticated;
create policy "Users can read their own votes"
  on public.caption_votes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can cast their own vote"
  on public.caption_votes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can change their own vote"
  on public.caption_votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists caption_generations_created_at_idx
  on public.caption_generations (created_at desc);
create index if not exists caption_votes_generation_id_idx
  on public.caption_votes (generation_id);

-- The Gemini server route calls this function so generation and its private
-- source/prompt details are inserted together in one transaction.
drop function if exists public.publish_caption_generation(text, text, text, text);

create or replace function public.publish_caption_generation(
  p_source_text text,
  p_humor_style text,
  p_prompt_text text,
  p_caption_text text,
  p_image_path text
)
returns table (
  id uuid,
  caption_text text,
  humor_style text,
  image_path text,
  upvotes integer,
  downvotes integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_generation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_source_text is not null and char_length(trim(p_source_text)) > 500 then
    raise exception 'Context must be 500 characters or fewer' using errcode = '22023';
  end if;
  if p_humor_style not in ('observational', 'absurdist', 'wholesome', 'campus_lore') then
    raise exception 'Unsupported humor style' using errcode = '22023';
  end if;
  if p_prompt_text is null or char_length(p_prompt_text) > 4000 then
    raise exception 'Invalid prompt' using errcode = '22023';
  end if;
  if p_caption_text is null or char_length(trim(p_caption_text)) not between 1 and 500 then
    raise exception 'Invalid caption' using errcode = '22023';
  end if;
  if p_image_path is null
     or left(p_image_path, char_length(current_user_id::text) + 1)
       <> (current_user_id::text || '/') then
    raise exception 'Image must belong to the signed-in user' using errcode = '42501';
  end if;

  insert into public.caption_generations (user_id, image_path, humor_style, caption_text)
  values (current_user_id, p_image_path, p_humor_style, trim(p_caption_text))
  returning caption_generations.id into new_generation_id;

  insert into public.caption_generation_details (generation_id, user_id, source_text, prompt_text)
  values (new_generation_id, current_user_id, nullif(trim(p_source_text), ''), p_prompt_text);

  return query
  select g.id, g.caption_text, g.humor_style, g.image_path,
         g.upvotes, g.downvotes, g.created_at
  from public.caption_generations as g
  where g.id = new_generation_id;
end;
$$;

revoke all on function public.publish_caption_generation(text, text, text, text, text) from public, anon;
grant execute on function public.publish_caption_generation(text, text, text, text, text) to authenticated;

-- Update public totals from the private vote table. The SECURITY DEFINER trigger
-- is the only path that changes the aggregate columns.
create or replace function public.apply_caption_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.caption_generations
    set upvotes = upvotes + case when new.vote = 1 then 1 else 0 end,
        downvotes = downvotes + case when new.vote = -1 then 1 else 0 end
    where id = new.generation_id;
    return new;
  end if;

  update public.caption_generations
  set upvotes = upvotes
        - case when old.vote = 1 then 1 else 0 end
        + case when new.vote = 1 then 1 else 0 end,
      downvotes = downvotes
        - case when old.vote = -1 then 1 else 0 end
        + case when new.vote = -1 then 1 else 0 end
  where id = new.generation_id;
  return new;
end;
$$;

revoke all on function public.apply_caption_vote_counts() from public, anon, authenticated;
drop trigger if exists caption_votes_update_counts on public.caption_votes;
create trigger caption_votes_update_counts
  after insert or update on public.caption_votes
  for each row execute function public.apply_caption_vote_counts();

-- Supabase Storage manages RLS on storage.objects. Keep the Assignment 3
-- avatar policies; this project SQL role does not own the managed table.

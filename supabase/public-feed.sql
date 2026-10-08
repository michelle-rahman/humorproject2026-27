-- Allow logged-out visitors to read published memes and their images.
-- Voting and meme generation remain restricted to authenticated users by the
-- existing policies on caption_votes and publish_caption_generation.

revoke select on public.caption_generations from anon;
revoke select (id, image_path, humor_style, caption_text, upvotes, downvotes, created_at)
  on public.caption_generations from anon;
grant select (id, image_path, humor_style, caption_text, upvotes, downvotes, created_at)
  on public.caption_generations to anon;

drop policy if exists "Signed-in users can read generated captions"
  on public.caption_generations;
drop policy if exists "Anyone can read generated captions"
  on public.caption_generations;
create policy "Anyone can read generated captions"
  on public.caption_generations for select to anon, authenticated
  using (true);

update storage.buckets
set public = true
where id = 'meme-images';

drop policy if exists "Signed-in users can view meme images" on storage.objects;
drop policy if exists "Anyone can view published meme images" on storage.objects;
create policy "Anyone can view published meme images"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'meme-images'
    and exists (
      select 1 from public.caption_generations
      where caption_generations.image_path = storage.objects.name
    )
  );

-- Allow publish_caption_generation to save both caption-only and image memes.
-- Run this migration after assignment-4.sql in Supabase SQL Editor.

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
  if p_image_path is not null
     and left(p_image_path, char_length(current_user_id::text) + 1)
       <> (current_user_id::text || '/') then
    raise exception 'Image must belong to the signed-in user' using errcode = '42501';
  end if;
  if p_image_path is null
     and (p_source_text is null or char_length(trim(p_source_text)) < 3) then
    raise exception 'A topic is required for caption-only memes' using errcode = '22023';
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

revoke all on function public.publish_caption_generation(text, text, text, text, text)
  from public, anon;
grant execute on function public.publish_caption_generation(text, text, text, text, text)
  to authenticated;

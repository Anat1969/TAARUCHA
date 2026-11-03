-- תליית חדרים מקובץ יצירות של אפליקציה (seed/rooms-<app>.json, מתוך tools/creations-rooms.mjs).
-- כל חדר: תערוכה קבועה לפי slug. קיים: מתעדכן והעבודות מוחלפות. חדש: נוצר ומתפרסם.
-- סגורה לציבור: רק בעל מסד הנתונים מריץ אותה. מהממשק, הייבוא עובר דרך /studio/import עם הרשאות מנהל.
create or replace function public.taarucha_import_rooms(rooms jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare r jsonb; eid uuid; nxt int; n int := 0;
begin
  for r in select * from jsonb_array_elements(rooms) loop
    select id into eid from taarucha_exhibitions where slug = r->>'slug';
    if eid is null then
      select coalesce(max(position), 0) + 1 into nxt from taarucha_exhibitions;
      insert into taarucha_exhibitions (slug, code, title, subtitle, curatorial_text, inquiry, kind, year, links, cover_url, status, published_at, position)
      values (r->>'slug', 'EX ' || lpad(nxt::text, 2, '0'), r->>'title', r->>'subtitle', r->>'curatorial_text', r->>'inquiry', r->>'kind', r->>'year', coalesce(r->'links', '[]'::jsonb), r->>'cover_url', 'published', now(), nxt)
      returning id into eid;
    else
      update taarucha_exhibitions set title = r->>'title', subtitle = r->>'subtitle', curatorial_text = r->>'curatorial_text', inquiry = r->>'inquiry',
        kind = r->>'kind', links = coalesce(r->'links', '[]'::jsonb), cover_url = r->>'cover_url', status = 'published', published_at = now()
      where id = eid;
      delete from taarucha_works where exhibition_id = eid;
    end if;
    insert into taarucha_works (exhibition_id, type, media_url, title, kicker, body, year, medium, position)
    select eid, w.type, w.media_url, w.title, w.kicker, w.body, w.year, w.medium, w.position
    from jsonb_to_recordset(coalesce(r->'works', '[]'::jsonb)) as w(type text, media_url text, title text, kicker text, body text, year text, medium text, position int);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.taarucha_import_rooms(jsonb) from public, anon, authenticated;

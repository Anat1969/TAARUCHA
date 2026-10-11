# TAARUCHA — exhibition platform of Arch. Anat David Stibelman

Public site for publishing exhibitions (collections of image, text and video works), with an in-page edit mode and a studio.
Live: https://taarucha.vercel.app — every push to `main` deploys automatically (Vercel project `taarucha`, id `prj_RtNW3b7DDZvVR7qAEt9zXuHngmeq`).

## How the owner works (read first)

- Work end to end without asking: plan, build, test, commit, push, deploy, verify. The owner only opens the GitHub repo and picks the Supabase project.
- Deliver the result (the live URL and one line on what changed), not a list of steps for her to do.
- Never hand her passwords, tokens or settings to configure. If something truly cannot be done from the session, say so in one sentence.
- Do not repeat corrections she already gave. Before any change, re-read "Design language" and "Lessons" below; after any correction, add it here.
- Each iteration should be more original than the last, not a safer copy.
- Communicate in Hebrew, concise, no icons.

## Stack

- Vite + React 18, react-router-dom 6, framer-motion 11. Plain JS, no TypeScript.
- Supabase project `cultura-GH` (id `ktqmwpbzcnzkhjskqisy`). The project is shared with other apps, so everything here is prefixed `taarucha_`.
- Publishable key and URL are in `src/lib/supabase.js` (public by design; access is enforced by RLS).

## Structure

- `src/pages/` Home, Exhibition (horizontal wall walk), Archive, About, NotFound
- `src/components/` Atmosphere (light, grid, grain), Header, Footer, Motion (Page, Lines, Reveal, Tilt, Img), Work, Lightbox, EditBar
- `src/studio/` Studio (list, exhibition editor, work editor, settings), upload helper, studio.css
- `src/lib/` supabase client, data queries and helpers (`asset()` prefixes local `/media/` paths), auth context (email/password, email link, Google when enabled)
- `public/media/` images shipped with the repo (first exhibition's flyers). New uploads go to the Supabase bucket.

## Data

- `taarucha_exhibitions`: slug, code (EX 01), title, subtitle, curatorial_text (blank line = new paragraph), year, cover_url, status draft|published, position (higher = first)
- `taarucha_works`: exhibition_id, type image|text|video|composite|document, file_url + file_name (original document; media_url = PDF page-1 preview), kicker, title, body, media_url, video_url (YouTube/Vimeo), year, medium, layout, position
- `taarucha_settings`: single row id=1 (name, tagline, bio, email, instagram)
- `taarucha_admins`: user_id and/or email. `taarucha_is_admin()` / rpc `taarucha_whoami()` = listed user id or listed email from the JWT.
- Storage bucket `taarucha-media` (public read, admin write).
- RLS: anyone reads published exhibitions and their works; only admins write.

## Editing

- Exhibition page: visitors see a quiet "עריכה" tab → `/studio?next=<page>` login → back to the same page. The admin sees a floating edit bar and per-work "עריכת העבודה" links into `/studio/e/:id#w-<workId>`.
- Upload straight on the exhibition page: the admin sees a large drop zone under the intro (`PageDrop`), same behaviour as the studio's. An exhibition with no works shows its cover; a cover uploaded to an empty exhibition also becomes its first work.
- Main upload path: the studio's gallery drop takes many files of any kind at once; each becomes a work (image, video, PDF → document with a page-1 preview rendered client-side by pdfjs, other files → document card). The first image becomes the cover if none. A PDF cover is converted to an image.
- Sign-in: email + password, email pre-filled, "סטודיו" button in the site header. The Google button appears only when `/auth/v1/settings` reports Google enabled; it is still off (needs Supabase + Google Cloud dashboard setup, not reachable from the session). Password change lives in the studio's settings page.

## Design language

- Option A "קיר": the exhibition is a walk along a lit wall. Architectural, minimal, grayscale only (#EDEDEA paper → #121212 ink); colour comes only from the works.
- IBM Plex Sans Hebrew 100–300 for display, IBM Plex Mono for labels. Thin weights only at large sizes; body text keeps 4.5:1 contrast.
- Always: animation, depth, shadow, perspective, gradients, layers. Never flat. Never icons (the Google mark on the sign-in button is the only exception).
- Wall labels in mono (W-01 · title / kicker / year · medium), scale bar as progress, spotlight and floor shadow per work.
- Hebrew, RTL, works at phone width (wall becomes a vertical stack under 900px).

## Commands

```
npm install
npm run dev
npm run build
```

## Lessons (do not repeat)

- Vercel MCP: team-scoped calls return 403. Create/update projects without `teamId`; it lands in the owner's account. Turn off `ssoProtection` so the site is public.
- The sandbox cannot reach supabase.co: seed and change data with the Supabase MCP (SQL), ship seed media in `public/media`.
- RTL horizontal scroll: measure the row with `width: max-content` + `offsetWidth`, not `scrollWidth`. Motion wrappers inside a flex row need `flex: 0 0 auto`.
- Test every button before pushing: Playwright against `vite preview` with Supabase routes mocked, including a fake admin session in localStorage (`sb-<ref>-auth-token`).
- Merge to `main` yourself (the owner only refreshes the live site). A PR left open means she sees nothing.
- "I uploaded and can't see it": check status (drafts are hidden from the public) and whether files went to works or only to the cover. The editor shows a draft banner with a publish button.
- Never leave an exhibition page blank: if the owner says "I see nothing", check works count, not only status; turn stray cover uploads into works (SQL) and fix the path that caused it.

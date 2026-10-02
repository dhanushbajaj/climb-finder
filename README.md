# Climb Finder

Find indoor and outdoor climbs in any area, add climbs from a photo or a sandbox wall, and get a move-by-move sequence (beta) worked out for your height and reach.

- **Explore**: pick a place (search, "use my location", or click the map) and a radius of 1–100 km.
  - Outdoor crags come from [OpenBeta](https://openbeta.io) (`cragsNear` GraphQL query, proxied by `/api/outdoor`).
  - Indoor gyms come from OpenStreetMap (Overpass, `/api/gyms-osm`) plus gyms people have registered in the app. "Add climbs here" registers an OSM gym.
- **Add a climb**
  - **Photo**: take or upload a picture of the wall, set its real height, tap each hold and pick its type, mark start/finish.
  - **Sandbox**: set wall width, height and angle, and place jugs, crimps, slopers, pinches, pockets, sidepulls, underclings, volumes and foot chips. Drag to move, undo/redo, Delete key to remove.
- **Solve**: an A* search over hand positions, with feet repositioned between hand moves, against a reach model built from your height and ape index (`lib/solver`). It prefers easier holds, short moves and real footholds (more so on overhangs), flags dynos and crosses, and when no sequence exists it points at the gap that's blocking you. The solve runs in a Web Worker.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (Postgres + PostGIS, Auth, Storage) · Leaflet/OpenStreetMap · Konva · Vitest · Playwright.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add Supabase keys
npm run dev
```

Without Supabase keys the app runs in **local mode**: everything works, but gyms and climbs are saved in your browser's localStorage only and there are no accounts.

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql`, either with the Supabase CLI (`supabase link` then `supabase db push`) or by pasting it into the SQL editor. It creates `profiles`, `gyms`, `climbs`, the `nearby_gyms` RPC, the `gyms_view` view, the public `wall-photos` storage bucket and row-level security policies (anyone can read, only the creator can change their own rows and photos).
3. Under **Authentication → URL configuration**, set the site URL and add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` as redirect URLs. Email magic links work out of the box; to use Google, enable the provider and add its client ID and secret.
4. Copy the project URL and anon key into `.env.local` (and into your Vercel project's environment variables).

Signed-out visitors can still build and solve climbs; saving falls back to their browser until they sign in.

## Deploy (Vercel)

Import the repo in Vercel, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and deploy. No other configuration is needed.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests: solver, OpenBeta and OSM normalizers, area parsing |
| `npm run build && npm run test:e2e` | Playwright: sandbox and photo builders, solving, saving, explore (APIs mocked), desktop and mobile |

## Layout

```
app/                 pages and API routes (explore, gyms, climbs, login, profile)
components/builder/  WallCanvas (Konva), palette, inspector, ClimbBuilder
components/beta/     beta panel, playback, climber size fields
components/map/      Leaflet map and area picker
lib/solver/          reach model, A* solver, beta text, Web Worker
lib/openbeta.ts      OpenBeta client
lib/osm.ts           Overpass client
lib/data.ts          Supabase / localStorage data access
supabase/migrations  database schema
```

## Limits

- The body model is approximate: treat the beta as a starting point. It doesn't model heel or toe hooks, flags, or hold orientation beyond display.
- Hold placement on photos is manual. Automatic hold detection would be a natural next step.
- OpenBeta and Overpass are free community services, so responses are cached (6 h and 24 h).


# Awkwardly

**For the things you wish you knew what to say.**

Awkwardly is a responsive message-writing studio, searchable survival-guide library, and branching conversation practice room. It runs locally without an AI key. Messages, writing preferences, and guide bookmarks are stored against a signed anonymous browser session.

## Requirements

- Node.js 20 LTS or newer
- npm

On Windows, install the current Node.js LTS from [nodejs.org](https://nodejs.org/en/download). If you install it or update `PATH` while VS Code is open, open a new terminal (or restart VS Code) before running npm commands.

## Local setup (Windows PowerShell)

Run these commands from the project folder:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open the Vite URL printed by the client (normally `http://localhost:5173`). The Express API listens on port `3001`; Vite proxies `/api` requests to it. SQLite stores the local database at `prisma/dev.db`.

`npm.cmd run db:migrate` applies the checked-in migration to the SQLite database. `npm.cmd run db:seed` upserts the survival-guide library; it is safe to run again after guide content changes. Both the client and server use `.env`.

If a newer npm version reports that dependency setup scripts were blocked, approve the Prisma and esbuild scripts and rebuild once, then continue with Prisma setup:

```powershell
npm.cmd install-scripts approve @prisma/client @prisma/engines prisma esbuild
npm.cmd rebuild
npm.cmd run db:generate
```

Only run that extra step when npm reports blocked install scripts. npm versions without `install-scripts` can skip it.

## Production build

After local setup and migration:

```powershell
npm.cmd run build
npm.cmd start
```

Set `NODE_ENV=production`, a persistent `DATABASE_URL`, and a `SESSION_SECRET` with at least 32 characters in the deployment environment. Apply migrations with `npm run db:deploy` before starting a release. Serve Awkwardly over HTTPS in production so the session cookie can use its `Secure` flag. The built Express server serves the Vite assets from `dist`.

## Optional AI provider

Without `AI_API_KEY`, message generation uses the local template engine and the UI labels those messages **Thoughtful templates**. No key is required for the app to work.

To enable an OpenAI-compatible chat-completions endpoint, set these values in the server's `.env` or deployment environment:

```dotenv
AI_API_KEY=your-server-side-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

The key is only read by Express and is never sent to the browser. When enabled, the scenario, recipient, channel, tone, length, directness, and optional context are sent to the configured provider to generate a message. Provider failures are surfaced as errors rather than silently substituting local output; provenance is recorded and shown in the UI.

## Features

- Funny, professional, and brutally-honest-but-respectful writing modes; scenario, recipient, channel, length, directness, and optional context inputs.
- Editable, regeneratable messages with copy, save/unsave, saved-message history, and persisted preferences.
- A 0–100 Awkwardness Meter. It is a transparent wording heuristic: higher values mean more detected wording signals, not a forecast of a real person's reaction.
- Searchable guide library with what-to-say / what-not-to-say examples, polite/funny/professional/direct alternatives, practical tips, bookmarks, and shortcuts into the studio and practice room.
- Five branching, restartable conversation simulations with multiple response paths and illustrative outcomes.
- Signed, HttpOnly, SameSite=Strict anonymous sessions; Zod request validation; per-session generation rate limiting; bounded JSON bodies; and privacy-conscious server logs.

There is no email/password account or cross-device sync. The anonymous cookie is the user's identity on that browser. Losing the cookie means the app cannot associate that browser with its previous messages. The current rate limiter is process-local and resets on server restart; use a shared limiter store before running multiple API instances.

## Tests and checks

```powershell
npm.cmd test
npm.cmd run build
```

The tests cover local generation and scoring, input validation, guide completeness, and reachability of every simulator branch. The build type-checks the frontend and server and produces both production bundles.

# PennTools

AI-powered tools for the Penn community, built as a Next.js monorepo. Each tool has its own page at `/tools/<id>`, including AskPenn, the chat assistant (`/tools/askpenn`).

## Quick start

```bash
bash scripts/test.sh
```

The setup script handles everything: installs dependencies, builds packages, spins up a Postgres container via Docker, applies the database schema, runs tests, builds the web app, and starts the dev server at **http://localhost:3000**.

### Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Node.js | 20 | https://nodejs.org |
| pnpm | 9 | `npm install -g pnpm` |
| Docker | any | https://docs.docker.com/get-docker |

The app needs Postgres. Docker is optional — without it, use any Postgres with the `vector` extension, set its URL as `DATABASE_URL` in `apps/web/.env.local`, and run:

```bash
pnpm install
pnpm --filter @penntools/platform build
# db:deploy doesn't read .env.local, so pass the URL on the command line
DATABASE_URL="<url>" pnpm --filter @penntools/platform db:deploy
pnpm dev
```

Locally, you don't need Google credentials: without them, **Sign in** logs you in as a local development user.

### Environment variables

Copy `.env.example` to `apps/web/.env.local` (the setup script does this automatically) and fill in:

```bash
# The platform's keys: OpenAI for embeddings and the legacy LLM API, Anthropic for
# the legacy LLM API only. New tools generate with users' own keys from Settings.
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""

# Auto-filled by test.sh if Docker is available
DATABASE_URL="postgresql://penntools:penntools@localhost:5432/penntools"

# Optional locally — Google sign-in (see .env.example)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXTAUTH_SECRET=""
```

## Monorepo layout

```
apps/
  web/                        Next.js app (port 3000)
packages/
  core/                       Shared interfaces and the AI API's types (only runtime dep: Zod)
  platform/                   Prisma DB, AI and embedding adapters, tool databases
tools/
  askpenn/                    One package per tool; AskPenn and
  platform-playground/        the Platform Playground are the reference tools
  ...
docs/
  ARCHITECTURE.md             Architecture decisions and conventions
scripts/
  test.sh                     One-shot dev setup
  new-tool.mjs                Scaffold a new tool (pnpm new-tool)
CLAUDE.md                     Rules for contributors and their coding agents
```

## Common commands

```bash
pnpm dev                                      # start all dev servers
pnpm test                                     # run all tests
pnpm --filter @penntools/tool-askpenn test    # run one package's tests
pnpm build                                    # production build
pnpm typecheck                                # TypeScript check
pnpm lint                                     # ESLint
pnpm check:tools                              # tool code follows the platform rules (no vendor SDKs or key access)
pnpm new-tool                                 # scaffold a new tool (see Adding a tool)

pnpm --filter @penntools/platform db:deploy   # apply schema changes + tool databases
```

## Deploying

The app runs on [Railway](https://railway.com). Railway has deprecated Config as Code (`railway.json`), so these commands are set by hand on the app service (**Settings → Deploy**):

| Setting | Value | Why it's needed |
|---|---|---|
| Start command | `pnpm --filter @penntools/web start` | The root `package.json` has no `start` script, so Railway can't detect one. |
| Pre-deploy command | `pnpm --filter @penntools/platform db:deploy` | Sets up the database (step 2 below); without it the tables are never created. |

Leave the build command empty: Railway runs the root `build` script (`turbo build`).

On each push to the tracked branch, Railway:

1. **Builds** the monorepo.
2. **Runs `db:deploy`** before switching traffic: pushes the platform schema, then creates each tool's database role and schema, applies the tool's `schema.sql` and runs its `seed.mjs` if it has one (see `packages/platform/scripts/setup-tools.mjs`). If this fails, the previous version keeps serving. On a fresh database, the first deploy takes about a minute longer while Career Canvas embeds the course catalog.
3. **Starts** the app with `next start`.

The database is Railway's pgvector Postgres template (the platform schema needs the `vector` extension). Set these variables on the app service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{pgvector.DATABASE_URL}}` — a reference to the database service |
| `OPENAI_API_KEY` | The platform's OpenAI key: embeddings (deploys use it to embed Career Canvas's course catalog, and searches use it for users without their own OpenAI key) and the legacy LLM API. New tools generate with users' own keys from Settings |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google OAuth client (redirect URI `<public URL>/api/auth/callback/google`) |
| `NEXTAUTH_SECRET` | Signs session cookies; generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | The app's public URL |

## Adding a tool

The recommended way is to ask your coding agent:

> "Register new team"

The agent asks for a tool ID (a name like `course-finder`), title, description, contributors and mentor, then runs the scaffold script for you. The new tool appears in the site's Tools menu (the button at the left of the header) right away. To run it yourself, answer its questions in the terminal, or pass the answers as options (some terminals, such as Git Bash on Windows, can't answer questions):

```bash
pnpm new-tool
pnpm new-tool --id course-finder --title "Course Finder" --description "Find Penn courses by topic." --contributors "Ada Lovelace, Alan Turing" --mentor "Grace Hopper"
```

Then build the tool with the platform APIs (user, AI, embeddings, database): section 4 of `CLAUDE.md` says how, with AskPenn (`tools/askpenn`) and the Platform Playground (`tools/platform-playground`) as the reference tools. Tool code may only use those APIs, and `pnpm check:tools` checks it. See `docs/ARCHITECTURE.md` for how the tool system works.

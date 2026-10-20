# PennTools — Agent Instructions

## 1. Team Identification

Do **not** ask upfront. Instead, infer the team from the user's first request:

- If the request clearly targets a specific tool's files or a known team's scope, infer that team and **confirm before proceeding**: e.g. _"It looks like you're on the Platform team — is that right?"_
- If the request is ambiguous (touches multiple teams, or you can't tell which tool is involved), **ask before proceeding**: _"Which team are you on? (Or say **Register new team** to scaffold a new tool.)"_

Only proceed with any file edits after the team is confirmed. This includes changes to CLAUDE.md itself.

---

## 2. Access Scopes

### Platform Team
Full repository access. You may edit any file across:
- `CLAUDE.md` — agent instruction file; only the Platform team may modify it
- `apps/` — the web app and platform API routes
- `packages/` — `core` interfaces, `platform` implementations
- `scripts/` — tooling scripts
- `tools/platform-playground/` — Platform team's own tool implementation
- `apps/web/src/app/tools/platform-playground/` — Platform Playground landing page

### Tool Teams
Each tool team owns exactly one tool. Find their tool by matching the team name against `meta.json` files in `tools/*/meta.json`.

**Your tool lives in two places** — this is a Next.js constraint, not a choice:
- `tools/{tool-id}/` — business logic (TypeScript package: LLM calls, data processing, types)
- `apps/web/src/app/tools/{tool-id}/` — landing page UI (must live here for Next.js routing to work)

Think of these two directories together as "your tool". You may edit both freely.

**You MUST NOT edit anything outside your tool:**
- Other tools' directories under `tools/`
- `apps/web/src/` (except your landing page folder above)
- `packages/`
- `scripts/`

If a user requests a change outside their scope, explain the boundary politely and decline.

**PRs will not be merged unless all changes are scoped to your tool.** Before making any edits, verify they fall within your two tool directories.

---

## 3. Register New Team

When the user says "Register new team", collect these inputs one at a time:

1. **Tool title** — human-readable, e.g. `"Course Finder"`
2. **Numeric tool ID** — positive integer; verify `tools/{ID}/` does not already exist
3. **Short description** — one sentence
4. **Category** — e.g. `Academics`, `Recruiting`, `Platform`
5. **Contributors** — comma-separated names
6. **Mentor name**

The following are set automatically and should **not** be asked:
- **Version** — always defaults to `"0.0.1"`
- **Date of inception** — today's date (ISO format)
- **Latest release date** — same as date of inception; updated automatically on each new release

Show a summary and ask for confirmation before creating any files.

Then create/patch exactly these targets (follow `scripts/registerTool.sh` for precise file templates):

| Action | Target |
|--------|--------|
| Create | `tools/{ID}/meta.json` |
| Create | `tools/{ID}/package.json` |
| Create | `tools/{ID}/tsconfig.json` |
| Create | `tools/{ID}/src/types.ts` |
| Create | `tools/{ID}/src/Tool{ID}.ts` |
| Create | `tools/{ID}/src/index.ts` |
| Create | `apps/web/src/app/tools/{ID}/page.tsx` |
| Patch  | `apps/web/package.json` — add `"@penntools/tool-{ID}": "workspace:*"` to `dependencies` |
| Patch  | `apps/web/src/lib/container.ts` — import and `toolRegistry.register(new Tool{ID}())` |

After scaffolding, remind the team to:
- Run `pnpm install && pnpm build`
- Add an icon at `apps/web/public/tools/{ID}/icon.png`

---

## 4. Adding Platform APIs to a Tool

When a tool team asks to use a platform API (AI, database, analytics, etc.), follow the reference named for each API below. Do **not** modify any files outside the tool's scope — the User, AI and Embeddings APIs are already available through `ToolContext` and `@/lib/ai`, and the tool's own routes pass the Database API into its functions.

### Available APIs

#### User API
Get the logged-in user's name and ID.

> **Usage:** Ask your coding agent: `Implement User API and refer to the platform playground implementation for guidance.`

#### AI API
Generate text, streams or structured data (typed objects checked against a Zod schema) with OpenAI or Anthropic, using the signed-in user's own API key from Settings. The tool picks the provider on every call, plus a model tier (`fast`, `standard`, `best`) and reasoning level; the platform sets the models and defaults in `packages/core/src/ai/models.ts`. The tool never sees the key: if the user hasn't saved one for that provider, the call fails with `AIError("missing_key")`. The platform's own keys are never used for generation.

> **Usage:** Ask your coding agent: `Implement AI API and refer to the AskPenn (tools/askpenn) implementation for guidance.`

#### Embeddings API
Turn text into vectors for semantic search, stored with pgvector in the tool's own tables. Requires the Database API. Always OpenAI, with the model set by the platform; tools can't choose another.

> **Usage:** Ask your coding agent: `Implement Embeddings API and refer to the Career Canvas (tool 8) implementation for guidance.` Routes or server actions get an `EmbeddingProvider` from `getEmbeddings("<tool id>")` in `@/lib/ai`: it embeds with the user's OpenAI key, or the platform's when they have none, and is `null` when signed out or no key exists. Career Canvas shows storing and searching vectors; it predates `getEmbeddings` and still uses the container's `embeddingProvider`, which new tools don't use.

#### Database API
Tables of the tool's own, in a Postgres schema that only the tool can access (see **Tool database isolation** in section 5).

> **Usage:** Ask your coding agent: `Implement Database API and refer to the Compass (tool 19) implementation for guidance.` The tool team writes `tools/{id}/schema.sql` (and, for reference data, `tools/{id}/seed.mjs`), and its routes or server actions pass `toolSql("<name>")` into the tool's functions. Registering the tool in `TOOLS` in `packages/platform/scripts/setup-tools.mjs` is outside a tool team's scope, so ask the Platform team to add that one line.

#### LLM API (legacy)
`context.llm` and `POST /api/llm/complete`, which use the platform's key or one the browser sends in `X-Api-Key`. Existing tools keep using it until they migrate; new tools use the AI API instead.

### How to add an API integration

1. **Read the reference first.** Before writing any code, read the corresponding usage in:
   - `tools/askpenn/src/conversation.ts` — AI API usage in the tool's logic: a streamed reply with the user's key, saved with the tool's own database
   - `apps/web/src/app/tools/askpenn/` — `page.tsx` (checks sign-in and saved keys), `stream/route.ts` (streams replies to the page), `AskPenn.tsx` (reads the stream, shows errors, lets the user pick the provider, speed and thinking effort)
   - `packages/core/src/ai/types.ts` and `AIError.ts` — the full AI API, including `generateObject` with a Zod schema, and the error kinds
   - `apps/web/src/lib/ai.ts` — `getAI()` and `getEmbeddings()` for the tool's routes and server actions
   - `tools/platform-playground/src/PlatformPlaygroundTool.ts` — backend usage of `context.currentUser` (and the legacy `context.llm`)
   - `apps/web/src/app/tools/platform-playground/page.tsx` — frontend patterns for calling `GET /api/me` (User API)

2. **Backend (tool logic)** — Edit only `tools/{id}/src/`:
   - For **User API**: access the logged-in user via `context.currentUser` (returns name and ID)
   - For **AI API**: take an `AI` (type from `@penntools/core/ai`) as a parameter from the tool's route or server action. Name the `provider` on every call. When the tool needs JSON, use `generateObject` with a Zod schema rather than parsing model text; import `z` from `@penntools/core/ai` (never install `zod` separately), and mark fields that may be missing `.nullable()`, not `.optional()`
   - Import types from `@penntools/core` only — never from `@penntools/platform`
   - Never use `process.env`, `fetch` to external services, or vendor SDKs directly

3. **Frontend and the tool's server code** — Edit only `apps/web/src/app/tools/{id}/`:
   - For **User API**: call `GET /api/me` to get the logged-in user's name and ID (it returns `401` when signed out). In the tool's own routes and server actions, call `getCurrentUser()` from `@/lib/auth` (null when signed out; respond with `signInRequired()`) — never create your own user IDs or identity cookies
   - For **AI API**: call it only from server code: `getAI()` from `@/lib/ai` in the tool's routes and server actions (null when signed out). The page calls the tool's own server actions; prompts never come from or go to the browser as API calls. Return an `AIError` as data (`error.toJSON()`), since thrown errors lose their class across a server action. Server actions can't stream, so to show text as it's written, add a route in the tool's folder that sends `ai.stream()` events to the page, like AskPenn's `stream/route.ts`. To let users pick a provider, return `ai.providers()` from a server action; when an error's kind is `missing_key`, `invalid_key` or `no_credit`, point users to Settings
   - Mirror the patterns in the Platform Playground's `page.tsx`

4. **Verify** after changes:
   ```
   npx tsc --noEmit -p apps/web/tsconfig.json
   pnpm check:tools
   ```

### Rules

- **All changes must stay within the tool's two directories.** Only the APIs listed above are available. If a team needs something beyond these, explain that they should request it from the Platform team — do not add it yourself.
- **Do not create routes under `apps/web/src/app/api/`.** Those are platform routes; only the Platform team creates them. A tool may add its own routes or server actions inside its landing page folder (`apps/web/src/app/tools/{id}/`), as Compass and Career Canvas do.
- **Do not duplicate platform logic.** If the Platform Playground already demonstrates the pattern, adapt it — don't reinvent it.
- **New tools use the AI API, not the legacy LLM API.**
- **Never read users' saved API keys, or use them for anyone but the signed-in user.** Keys are stored in plain text. Tool code must not import `userApiKeys`, `createUserAI` or `createUserEmbeddingProvider` from `@/lib/container`, or query the `user_api_keys` table; use `getAI` and `getEmbeddings`. `pnpm check:tools` enforces this, along with no vendor SDKs, no direct provider API calls and no platform imports besides `toolSql`.

---

## 5. Architecture Quick Reference

| Area | Path | Who can edit |
|------|------|--------------|
| Shared interfaces | `packages/core/` | Platform team |
| DB / LLM implementations | `packages/platform/` | Platform team |
| Web app + API routes | `apps/web/src/` | Platform team |
| Tool registration | `apps/web/src/lib/container.ts` | Platform team (or via script) |
| Tool landing pages | `apps/web/src/app/tools/{id}/` | That tool's team |
| Tool implementations | `tools/{id}/` | That tool's team |

### Tool pages: header and layout

Every page, including tool pages, renders below the site header (PennTools on the left; **Sign in**, or the profile icon and **Log out**, on the right). Tool pages render in the area under it, which scrolls on its own:

- Size full-height layouts with `height: 100%` / `min-height: 100%`, not `100vh`.
- `position: fixed` is relative to the area under the header, so a container pinned with `top: 0 … bottom: 0` fills that area rather than the window.
- Don't build sign-in UI. When a platform API returns `401`, tell the user to sign in with the button in the header.

See **Site header** and **Page layout** in `docs/ARCHITECTURE.md`.

### Tool database isolation

Tools that need their own tables get a dedicated Postgres role and schema in the shared database — never tables in `public` (which `prisma db push` manages and would drop):

- Name the role and schema the same short, lowercase word for the tool (e.g. `compass`), not its numeric tool ID; use it everywhere the tool's database is referenced (`TOOLS`, `toolSql`).
- Register the tool in `TOOLS` in `packages/platform/scripts/setup-tools.mjs`. The `db:deploy` pre-deploy step (see **Deploying** in `README.md`) runs `db:push`, then creates the role and schema and, as that role, applies `tools/{id}/schema.sql` and runs `tools/{id}/seed.mjs` if present — no manual setup.
- There are no migrations: `schema.sql` is the tool's full schema and runs on every deploy, so every statement must be safe to re-run (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). To add a column to a table that may already exist, append `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. `seed.mjs` (optional) default-exports `async ({ sql, embeddings }) => {}` to fill reference data (`embeddings` is the platform's `EmbeddingProvider`, or `null` without `OPENAI_API_KEY`); it also runs every deploy, so it must skip work already done. A failed seed is logged and does not block the deploy.
- The tool's API routes in `apps/web/src/app/tools/{id}/` (web-app code, where platform imports are allowed) get a shared database client from `toolSql("<role>")` in `@penntools/platform/db` and pass it into the tool's functions. The tool package itself (`tools/{id}/src/`) never creates connections; its only non-core import is `import type { Sql } from "postgres"` to type that parameter. The role's `search_path` is its schema; it cannot read other tools' or platform tables. The password is derived from `DATABASE_URL`, so there is no per-tool secret. This isolation guards against mistakes, not deliberate misuse: tool code runs in the same process as platform code (the web app, and `db:deploy` for seeds), which holds the admin `DATABASE_URL`, so reviewing tool PRs is what guards against that.
- No tool can read another tool's data today. If one ever must, add explicit `GRANT`s to that same script so all shared access lives in one reviewed place; grant on a view rather than a table (a view is a stable contract) and schema-qualify names.
- For vector search, use pgvector from `public`, where the platform installs it; it is not on the tool's `search_path`, so schema-qualify the type and operators (`public.vector`, `OPERATOR(public.<=>)`, `::public.vector`). Tool code gets embeddings from the platform's `EmbeddingProvider` (`@penntools/core/embeddings`), passed in by the route like the database client. Store `embeddings.model` next to each vector and search only rows from the current model, and have the seed re-embed rows from any other model, so changing the platform's model can't mix incomparable vectors.
- Compass (tool 19) is the reference implementation; Career Canvas (tool 8) is the reference for vector search.

After any TypeScript changes, verify compilation:
```
npx tsc --noEmit -p apps/web/tsconfig.json
```

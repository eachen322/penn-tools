# PennTools Architecture

## Layers

```
┌──────────────────────────────────────────────────────────┐
│  apps/web  (Next.js)                                     │
│   └─ route handlers → container.ts (DI root)            │
│   └─ lib/auth.ts (Google sign-in, getCurrentUser)       │
│   └─ React components → hooks → fetch()                 │
├──────────────────────────────────────────────────────────┤
│  packages/platform  (reads env vars, constructs clients) │
│   ├─ Prisma repositories                                 │
│   ├─ AI adapters (OpenAI Responses, Anthropic Messages)  │
│   ├─ Legacy LLM adapters (OpenAI, Anthropic)             │
│   ├─ Embedding adapters (OpenAI)                         │
│   ├─ Analytics (PostHog)                                 │
│   └─ Tool databases (toolSql; setup-tools for db:deploy) │
├──────────────────────────────────────────────────────────┤
│  packages/core  (pure interfaces, no env, no vendor SDK) │
│   ├─ Tool, ToolRegistry, ToolRunner, ToolContext         │
│   ├─ AI API types, model catalog, AIError, z (Zod)       │
│   ├─ EmbeddingProvider, legacy LLMProvider interfaces    │
│   ├─ Analytics interface                                 │
│   └─ Repository interfaces (User, ToolData, UserApiKey) │
├──────────────────────────────────────────────────────────┤
│  tools/<tool_id>  (one folder per tool)                  │
│   ├─ extend Tool, implement execute(input, context)      │
│   └─ optional schema.sql + seed.mjs (own DB schema)      │
└──────────────────────────────────────────────────────────┘
```

### Dependency rules

| Package | May import from | Must NOT import from |
|---------|----------------|---------------------|
| `core` | Node builtins, `zod` (re-exported as `z` for AI schemas) | `platform`, `env`, any vendor SDK |
| `platform` | `core`, vendor SDKs, `process.env` | `apps/web`, `tools/*` |
| `tools/*` | `core` only | `platform`, `process.env`, fetch, Prisma |
| `apps/web` | `core`, `platform`, `tools/*` | — |

A tool with its own schema still follows these rules: its API route in
`apps/web` gets a shared database client from `toolSql("<role>")`
(`@penntools/platform/db`) and passes it into the tool's functions. The tool
never opens connections; it may only `import type { Sql } from "postgres"` to
type that parameter.

---

## Tool system

### Tools as mini-websites

Every tool is a first-class feature with its own UI page at `/tools/[tool-id]`, not
just a backend function. AskPenn, the chat assistant, is a tool like any other
(`tools/askpenn`, at `/tools/askpenn`).

AskPenn and the Platform Playground (`tools/platform-playground`) are the
reference tools for new tool teams. AskPenn shows streaming, chat history and a
tool's own database. The Playground shows single replies, structured output,
embeddings, the User API and testing with fake APIs.

Each tool ships with:
- **Backend logic** — the `Tool` class in `tools/<tool-id>/` (pure `core`-only, no UI)
- **UI page** — a Next.js page at `apps/web/src/app/tools/[tool-id]/page.tsx`
- **UI components** — co-located under `apps/web/src/app/tools/[tool-id]/`

The tool `manifest` (defined in the `Tool` class) is the single source of truth for a
tool's name and description, shown by the tool pages' info button (`/api/tools`):

```ts
manifest = {
  id: "course-finder",
  name: "Course Finder",
  description: "Find Penn courses by topic, requirement, or instructor.",
}
```

### Folder layout (tool with UI)

```
tools/
  course-finder/          ← backend package (@penntools/tool-course-finder)
    src/
      index.ts            ← CourseFinderTool extends Tool<Input, Output>
    src/__tests__/

apps/web/src/app/
  tools/
    page.tsx              ← /tools  →  directory of all registered tools
    [tool-id]/
      page.tsx            ← /tools/course-finder  →  tool's full UI
      components/         ← tool-specific React components (optional)
```

### Adding a new tool

1. `mkdir tools/my-tool && cd tools/my-tool`
2. Copy the structure of `tools/course-finder`.
3. Extend `Tool<MyInput, MyOutput>` and fill in `manifest` + `execute()`.
4. Add `@penntools/tool-my-tool` to `apps/web/package.json` dependencies.
5. In `apps/web/src/lib/container.ts`, add one import + one `toolRegistry.register(new MyTool())` call (guarded by the duplicate-id check).
6. Create `apps/web/src/app/tools/my-tool/page.tsx` for the tool's UI page.
7. Write tests in `src/__tests__/`.

### How the registry works

Tools are registered **explicitly** at server startup (not at import time).
This avoids hidden ordering dependencies and allows isolated registries in tests.

```ts
// container.ts (server-only, runs once per process)
import { toolRegistry } from "@penntools/core/tools";
import { CourseFinderTool } from "@penntools/tool-course-finder";

if (!toolRegistry.get("course-finder")) {
  toolRegistry.register(new CourseFinderTool());
}
```

`ToolRunner.run(toolId, input, userId)` looks up the tool, checks `canAccess()`,
builds a `ToolContext` (injecting db, llm, ai, embeddings, analytics, logger,
config), and calls `tool.execute(input, context)`. Nothing in the app calls it
since AskPenn's `/tool` chat command was removed: tools do their work from their
own pages, routes and server actions, and `execute()`, `ToolContext` and
`ToolRunner` are due to be removed.

---

## AI API

New tools generate text and structured data through `@penntools/core/ai`;
existing tools keep the legacy LLM API (`context.llm`, `/api/llm/complete`)
until they migrate, after which it is deleted. How to call it is in CLAUDE.md
section 4; this section covers the design.

- **Keys stay server-side.** `createUserAI(userId)` in `container.ts` builds an
  `AI` whose calls use that user's saved key for the requested provider, and
  fail with `missing_key` when there is none; the platform's keys are never
  used for generation. Tools get it as `context.ai`, or from `getAI()`
  (`apps/web/src/lib/ai.ts`, bound to the signed-in user). Keys stay inside the
  adapters' closures, and `AIError` messages are written by the platform, so no
  key reaches tool code or logs.
- **One model catalog.** The tool picks the provider; models and their default
  reasoning come from `packages/core/src/ai/models.ts`, so changing a model is
  a one-file change. Requests are checked against a Zod schema in `createAI`,
  since they can carry browser input.
- **Adapters** (`packages/platform/src/ai/`): OpenAI's Responses API and
  Anthropic's Messages API, each a single `stream()`. `createAI` builds
  `generate()` and `generateObject()` by collecting the stream, so every request
  streams and long replies never hit non-streaming limits. For
  `generateObject`, the adapter sends the Zod schema as structured output and
  returns the raw text; `createAI` checks the stop reason (refused, cut off)
  before parsing and validating.
- **Errors.** Every failure reaching a tool is an `AIError` (aborts excepted):
  provider errors map to a kind, and anything else (a connection dropped
  mid-stream, a bug) becomes `unavailable` and is logged in full.
- **Embeddings.** Always OpenAI with `EMBEDDING_MODEL`. Seeds (`db:deploy`) use
  the platform's key. Search queries (`context.embeddings`, `getEmbeddings`)
  use the user's OpenAI key, or `OPENAI_API_KEY` when they haven't saved one;
  each platform-key call logs `embeddings.platform_key`, and its cost shows on
  that key in OpenAI's usage dashboard.
- **Enforcement.** `pnpm check:tools` (`scripts/check-tool-imports.mjs`) fails
  if tool code imports a vendor SDK, calls a provider API, or touches users'
  keys or platform internals.

---

## Identity and sign-in

- There are no anonymous users. A `users` row exists only once someone signs in
  with Google, keyed by `google_id`; each sign-in refreshes their name, email
  and picture.
- Sign-in uses NextAuth (`apps/web/src/lib/auth.ts`). Sessions are signed JWT
  cookies carrying the `users` row id; there are no session tables. In
  development without Google credentials, sign-in logs in as a fixed local user.
- `getCurrentUser()` (`apps/web/src/lib/auth.ts`) is the one place server code
  gets the current user. Signed-out visitors can browse pages, but it returns
  null for them and APIs that need a user respond `401` via `signInRequired()`.
- Every repository method receives `userId` explicitly — there are no implicit
  "current user" globals.

---

## Site header and page layout

### Site header

The root layout (`apps/web/src/app/layout.tsx`) renders `SiteHeader`
(`apps/web/src/components/layout/SiteHeader.tsx`) above every page, including
tool pages. It is a server component that calls `getCurrentUser()`:

- **Left:** "PennTools", linking to the home page.
- **Signed out:** a **Sign in** button. It signs in with the provider in
  `signInProvider` (Google, or the local development user) and returns to the
  same page. It is disabled when sign-in isn't configured.
- **Signed in:** the profile picture (or initial), linking to account settings
  at `/settings` (the Google profile, and the user's own OpenAI and Anthropic
  API keys; see `user_api_keys` under **Data model**), and **Log out**, which
  signs out and stays on the page.

Pages that need a user render `SignInPrompt` for signed-out visitors instead of
their content (`/settings` and AskPenn do). Because `getCurrentUser()` reads the
request's cookies, every page renders per request rather than being prerendered;
it is cached per request, so the header and the page share one user lookup.

### Page layout

Below the header, every page renders inside `.app-viewport`, which fills the rest
of the window and scrolls on its own (styles in `apps/web/src/app/globals.css`).
For page authors this means:

- Size full-height layouts with `height: 100%` / `min-height: 100%`, not `100vh`;
  `100vh` is taller than the space under the header and adds a scrollbar.
- `position: fixed` is relative to the area under the header, not the window
  (`.app-viewport` uses `contain: layout`). A full-screen container pinned with
  `top: 0 … bottom: 0` fills the area under the header instead of covering it,
  and fixed modals and toasts stay in place while the page scrolls.
- Don't build sign-in UI in a tool; when a platform API returns `401`, ask the
  user to sign in with the button in the header.

---

## Data model

See `packages/platform/prisma/schema.prisma` for the canonical schema.

Key design choices:
- `tool_data` uses a generic `(userId, toolId, key) → jsonValue` pattern so tools
  can persist state without needing their own migrations.
- `user_api_keys` holds the OpenAI and Anthropic keys users save on `/settings`
  (at most one per provider), in plain text. Keys are checked with the provider
  before saving and never sent back to the browser; the page shows only the last
  four characters. The repository is `userApiKeys` in `container.ts`, kept out of
  `repositories` (which tools get as `context.db`), so tools never receive keys;
  tool code must not import it either (enforced by `pnpm check:tools`). The AI
  API reads keys on the tool's behalf.
- Tools that need real tables (queries across users, relations, search) get their
  own Postgres role and schema in the same database, never tables in `public`,
  which `prisma db push` manages and would drop. `db:deploy` (`prisma db push`,
  then `packages/platform/scripts/setup-tools.mjs`) creates each role and schema
  and, as that role, applies `tools/{id}/schema.sql` and runs the optional
  `tools/{id}/seed.mjs`. Like `prisma db push` for the platform, both run on
  every deploy and must be safe to re-run; there are no migrations. A tool role
  cannot read platform or other tools' tables. Compass (tool 19, schema
  `compass`) is the reference.
- Tools use pgvector from `public`, where the platform installs it. That schema is
  not on a tool role's `search_path`, so tool SQL schema-qualifies the type and
  operators (`public.vector`, `OPERATOR(public.<=>)`). Each vector is stored
  with the model that made it; searches compare only the current model's
  vectors, and the seed re-embeds the rest. Career Canvas (tool 8, schema
  `careercanvas`) is the reference.
- Tool metadata is not stored in the database; the registry in code is the
  source of truth.

---

## Configuration

All env var reads happen in `packages/platform`, `apps/web/src/lib/container.ts`
and `apps/web/src/lib/auth.ts`. Core interfaces and tools never access `process.env`.

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | platform/prisma, `db:deploy` | Postgres admin connection; tool role passwords are derived from it |
| `OPENAI_API_KEY` | platform/embeddings, web/lib/container, `db:deploy`, platform/llm | Embeddings: tool seeds (e.g. Career Canvas course embeddings; skipped when unset) and search queries from users without their own OpenAI key. Also the legacy LLM API |
| `ANTHROPIC_API_KEY` | platform/llm | Legacy LLM API only; the AI API uses users' own keys |
| `POSTHOG_API_KEY` | platform/analytics | Event tracking |
| `POSTHOG_HOST` | platform/analytics | PostHog instance URL |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | web/lib/auth | Google sign-in (OAuth client); without them, development signs in as a local user and production disables sign-in |
| `NEXTAUTH_SECRET` | web/lib/auth | Signs session cookies; required with the Google credentials |
| `NEXTAUTH_URL` | web/lib/auth | The site's public URL; required in production |

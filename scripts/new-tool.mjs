#!/usr/bin/env node
// Scaffolds a new tool: its package in tools/<id>/, a placeholder page at
// /tools/<id>, and its entries in apps/web/package.json and container.ts.
//
//   pnpm new-tool --id course-finder --title "Course Finder" \
//     --description "Find Penn courses by topic." \
//     --contributors "Ada Lovelace, Alan Turing" [--mentor "Grace Hopper"] [--yes]
//
// Options left out are asked for in the terminal. Coding agents collect the
// answers in conversation (CLAUDE.md section 3) and pass them all with --yes.
// Everything is checked before anything is written, so a failed run changes
// nothing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

// ── Answers ──────────────────────────────────────────────────────────────────

const { values: options } = parseArgs({
  options: {
    id: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    contributors: { type: "string" },
    mentor: { type: "string" },
    yes: { type: "boolean", default: false },
  },
});

const questions = [
  { key: "id", required: true, ask: "Tool ID (lowercase words joined by hyphens, e.g. course-finder)" },
  { key: "title", required: true, ask: "Title (e.g. Course Finder)" },
  { key: "description", required: true, ask: "One-sentence description" },
  { key: "contributors", required: true, ask: "Contributors (comma-separated names)" },
  { key: "mentor", required: false, ask: "Mentor (optional)" },
];
const interactive = process.stdin.isTTY && !options.yes;
const terminal = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

const answers = {};
for (const { key, ask } of questions) {
  let value = options[key];
  if (value === undefined && terminal) value = await terminal.question(`${ask}: `);
  answers[key] = (value ?? "").trim();
}

// ── Checks ───────────────────────────────────────────────────────────────────

const missing = questions.filter(({ key, required }) => required && !answers[key]).map(({ key }) => `--${key}`);
if (missing.length) {
  // Some terminals (Git Bash on Windows, for one) can't answer questions, so
  // say how to pass the answers instead.
  const why = terminal || options.yes ? "" : " This terminal can't answer questions, so pass every answer as an option:";
  fail(
    `Missing ${missing.join(", ")}.${why}\n` +
      `  pnpm new-tool --id course-finder --title "Course Finder" --description "Find Penn courses by topic." ` +
      `--contributors "Ada Lovelace, Alan Turing" [--mentor "Grace Hopper"]`,
  );
}

const { id, title, description, mentor } = answers;
const contributors = answers.contributors.split(",").map((name) => name.trim()).filter(Boolean);
if (!ID_PATTERN.test(id)) {
  fail(`Tool ID "${id}" must be lowercase letters and digits, words joined by hyphens (e.g. course-finder).`);
}
if (contributors.length === 0) fail("Name at least one contributor.");
for (const [key, value] of Object.entries({ title, description, mentor })) {
  if (/[\r\n]/.test(value)) fail(`--${key} must be a single line.`);
}

const toolDir = join(root, "tools", id);
const pageDir = join(root, "apps", "web", "src", "app", "tools", id);
for (const dir of [toolDir, pageDir]) {
  if (existsSync(dir)) fail(`${dir.slice(root.length + 1)} already exists. Pick another tool ID.`);
}

const words = id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join("");
const className = `${words}Tool`;
const packageName = `@penntools/tool-${id}`;

const webPackagePath = join(root, "apps", "web", "package.json");
const containerPath = join(root, "apps", "web", "src", "lib", "container.ts");
const webPackage = readFileSync(webPackagePath, "utf8");
const container = readFileSync(containerPath, "utf8");
const eol = container.includes("\r\n") ? "\r\n" : "\n";
const containerLines = container.split(eol);
const lastRegister = containerLines.findLastIndex((line) => line.includes("toolRegistry.register("));
if (lastRegister < 0) fail("Could not find toolRegistry.register(...) in container.ts.");
// e.g. "ask-penn" would become AskPennTool, which "askpenn" already uses.
if (new RegExp(`\\b${className}\\b`).test(container)) {
  fail(`container.ts already uses the class name ${className}. Pick a tool ID that's less like an existing one.`);
}

// ── Confirm ──────────────────────────────────────────────────────────────────

console.log(`
  Tool:          ${title} (${id})
  Description:   ${description}
  Contributors:  ${contributors.join(", ")}
  Mentor:        ${mentor || "(none)"}

  Creates tools/${id}/ (${packageName}, class ${className})
  and apps/web/src/app/tools/${id}/page.tsx, and registers the tool in
  apps/web/package.json and apps/web/src/lib/container.ts.
`);
if (!options.yes) {
  if (!terminal) fail("Pass --yes to create the tool.");
  const confirm = await terminal.question("Create it? [y/N] ");
  if (!/^y(es)?$/i.test(confirm.trim())) {
    console.log("Nothing created.");
    process.exit(0);
  }
}
terminal?.close();

// ── Write ────────────────────────────────────────────────────────────────────

const str = (value) => JSON.stringify(value); // a safely quoted string literal

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

write(
  join(toolDir, "package.json"),
  JSON.stringify(
    {
      name: packageName,
      version: "0.0.1",
      private: true,
      type: "module",
      exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      scripts: {
        build: "tsc",
        dev: "tsc --watch",
        typecheck: "tsc --noEmit",
        test: "vitest run --passWithNoTests",
        clean: "rm -rf dist",
      },
      dependencies: { "@penntools/core": "workspace:*" },
      devDependencies: { typescript: "^5.4.0", vitest: "^1.6.0" },
    },
    null,
    2,
  ) + "\n",
);

write(
  join(toolDir, "tsconfig.json"),
  JSON.stringify(
    { extends: "../../tsconfig.base.json", compilerOptions: { outDir: "./dist", rootDir: "./src" }, include: ["src"] },
    null,
    2,
  ) + "\n",
);

write(
  join(toolDir, "src", `${className}.ts`),
  `import { Tool } from "@penntools/core/tools";
import type { ToolManifest } from "@penntools/core/tools";

// The tool's title (listed in the site sidebar) and details (shown by the
// info button on its page). Its logic goes in other files in this folder,
// called from its page, routes and server actions in
// apps/web/src/app/tools/${id}/ (see section 4 of CLAUDE.md).
export class ${className} extends Tool {
  readonly manifest: ToolManifest = {
    id: ${str(id)},
    title: ${str(title)},
    description: ${str(description)},
    contributors: [${contributors.map(str).join(", ")}],${mentor ? `\n    mentor: ${str(mentor)},` : ""}
  };
}
`,
);

write(join(toolDir, "src", "index.ts"), `export { ${className} } from "./${className}.js";\n`);

write(
  join(pageDir, "page.tsx"),
  `// A placeholder page. To build the tool, see section 4 of CLAUDE.md: AskPenn
// (tools/askpenn) and the Platform Playground (tools/platform-playground) are
// the reference tools.

export default function ${words}Page() {
  return (
    <div>
      <h1>{${str(title)}}</h1>
      <p>{${str(description)}}</p>
    </div>
  );
}
`,
);

const pkg = JSON.parse(webPackage);
// Keep the dependencies in alphabetical order, as pnpm writes them.
pkg.dependencies = Object.fromEntries(
  Object.entries({ ...pkg.dependencies, [packageName]: "workspace:*" }).sort(([a], [b]) => (a < b ? -1 : 1)),
);
const pkgEol = webPackage.includes("\r\n") ? "\r\n" : "\n";
writeFileSync(webPackagePath, (JSON.stringify(pkg, null, 2) + "\n").replace(/\n/g, pkgEol));

containerLines.splice(
  lastRegister + 1,
  0,
  `import { ${className} } from ${str(packageName)};`,
  `toolRegistry.register(new ${className}());`,
);
writeFileSync(containerPath, containerLines.join(eol));

console.log(`✔ Created ${title} at tools/${id}/ and /tools/${id}.

  Next:
    pnpm install, then pnpm dev
    Build the tool with the platform APIs: see section 4 of CLAUDE.md, with
    AskPenn (tools/askpenn) and the Platform Playground (tools/platform-playground)
    as the reference tools.
`);

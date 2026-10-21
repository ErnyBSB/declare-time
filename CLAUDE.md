# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

**Declaração de disponibilidade** (repository `declare-time`): a static PWA where
each person declares, for themselves, the hours and periods they expect to be
available at work ("from 01/09 to 31/12, Mon–Fri, 9h–15h"). Readers (`leitor`) see
the declarations of their units, and administrators (`adm`) see everything, in
tables and charts. It is a **forecast of availability, not a time clock**: nothing
is checked against what actually happened, and nothing feeds a performance metric.

It inherits its whole architecture from the **Programa de Resultados — COBIB**
([`ErnyBSB/resultados`](https://github.com/ErnyBSB/resultados), v1.16), whose
"Horários" section becomes the whole program here. When the docs say "the origin
project", they mean that repository.

There is **no server**. Shared state lives in a Windows network folder reached from
the browser through the **File System Access API**, so the app runs in Chrome/Edge
only. Offline use comes from a cache-first service worker.

**`project_design.md` is the source of truth** for architecture, data model, roles,
decisions and roadmap. Read it before any change that touches those. Section 12
records the decisions already taken; do not reopen them without a new argument.
Section 13 is the roadmap.

## Objectives (in priority order)

1. **Zero infrastructure.** No backend, no database, no npm, no build step, no CDN.
   The app must run by opening `code/index.html` from a folder. Any proposal that
   adds a server, a package manager, or a network dependency is out of scope — say
   so before implementing.
2. **No write conflicts by construction.** *One file, one single writer*: each
   person writes only their own `declaracoes/<slug>.json`, with no exception — not
   even for administrators. Only `adm` writes `config.json`; since there can be
   several administrators, `gravarConfig` must re-read the file strictly and refuse
   the write if `atualizadoEm` changed since the screen loaded it.
3. **Backward-compatible data.** Files already written in the shared folder must
   keep loading. Handle a missing field by its absence (`(x && x.campo) || padrão`),
   never by migrating or rewriting a person's file. Never rename a persisted key
   (JSON fields, role names, `localStorage` keys) — add a new versioned key instead.
4. **Legible to non-technical staff.** UI, code comments, and docs are **pt-BR**.
   The interface explains refusals rather than failing silently.
5. **Accessible and dependency-light.** Native elements first. ECharts is the only
   vendored library, and it is vendored, not fetched. The declarations timeline is
   plain HTML/CSS, not ECharts.

## Layout

```
code/                    the app — one copy, always the current version
  index.html             UI + all app logic + inline CSS, in one file
  versao.js              the ONE place the app version is written
  catalogo.js            static seed: workday lengths, weekday labels, example
                         folder path; empty units and passwords (public repo)
  rede.js                network folder access (pruned from origin)
  sw.js                  service worker; cache key "dt-" + versao
  manifest.webmanifest   PWA metadata (name shows on the installed icon)
  gerar-senha.html       standalone tool: sha256("nome|senha")
  echarts.min.js         vendored chart library (phase 4)
  icons/                 icon-192.png, icon-512.png — required for offline install
  LEIA-ME.txt            the real documentation: what changed and WHY
project_design.md        structured reference: schemas, roles, decisions, roadmap
```

Everything lives in a single `index.html` because modules (`type=module`) do not
load from `file://`, and there is no build step to bundle them.

**The two documents differ in purpose.** `code/LEIA-ME.txt` argues each decision in
conversational pt-BR prose — update it on every behavioral change.
`project_design.md` is the structured reference; update it when the architecture,
the data model, the roles or the limitations move.

## Working conventions

**Versioning is git only.** `code/` is always the current version; each published
version is a **tag** (`v0.1`, `v0.2`, …, `v1.0`). Never create per-version folders
or dated copies. Numbering is `0.x` until the app is used with real data; `v1.0`
is the first production use, after which the schema in section 5 is frozen.

**Publishing a version requires two edits, and they must agree:**
1. `code/versao.js` → `versao`, `rotulo` and `atualizado` (manual date). The rail
   label, the About window and the service worker cache key all derive from it —
   never write the number anywhere else.
2. the repository tag (`git tag -a vX.Y`).

**Branches and commits.** One branch per version in progress, merged to `main` by
PR, then tagged on `main`. Commits follow Conventional Commits and are written in
**English** — UI, comments and docs are pt-BR, the git history is not. The subject
describes the user-visible change; the body argues the why; the footer carries
`Refs: #<issue>` and `Assisted-by: IA`.

**Code style.** `"use strict"`, pt-BR identifiers (`declaracao`, `garantirPermissao`,
`atualizarArquivoPessoa`), `/* ===== TITLE ===== */` banners at section heads.
Inline comments explain *why*, in the LEIA-ME voice. Role checks go through the
predicates `ehPessoa()`, `ehLeitor()`, `ehAdm()`, `ehMeu(d)` and
`unidadesVisiveis()` — never inline role-string comparisons. Hiding a rail item is
not access control; scope lives in `podeVer(v)`.

**Styling.** CSS custom properties in `:root` with pt-BR names (`--tinta`, `--papel`,
`--ficha`, `--verde`, `--dourado`, `--grafite`, `--linha`, `--raio`). Colors carry
meaning — **green is a current declaration, gold is a mismatch between the declared
range and the workday** — so do not reuse them decoratively. Keep
`[hidden]{display:none !important}`.

## Domain model

- **Roles are cumulative and come from `config.json`**, never from a screen choice.
  Everyone registered is a `pessoa` and declares only for themselves. `leitor`
  (a list of units) and `adm` (`true`) are attributes inside `pessoas[nome]`. Many
  leitores per unit, many admins. The last `adm` cannot be removed.
- **Declaration** (`project_design.md` 5.1): period `de`…`ate` (`ate: null` = open
  ended), weekdays `dias` (0 = Sunday), one range `inicio`–`fim` per declaration
  (split shifts are two declarations; crossing midnight is refused), `carga` and
  `unidade` stamped as snapshots.
- **Collision** only when period + weekday + hour all overlap.
- **Lifecycle**: delete only before it starts (`de` > today); end a current one by
  setting `ate` to today or later (only shortening); never edit one that has started;
  "substituir" ends the current on the eve of the new start (today or later) and
  creates the new one in a single write. Status (vigente/futura/encerrada) is
  computed against today, never stored.
- **Divergence** (gold) compares the jornada with the day's total across all
  declarations valid together on that weekday — not each declaration alone, so a
  split shift is not flagged.
- **Every write** to a person's file goes through `atualizarArquivoPessoa`, which
  reads with `lerArquivoParaGravar` (missing ≠ unreadable), rebuilds the state with
  **all** keys of the file, applies the change and rewrites it.
- **Reserved names**, not used in 1.0: keys `realizados` and `ausencias`.

## Verifying changes

There are no tests and no runner. To check a change, open `code/index.html` in
Chrome against a local test folder (named `pasta-teste/`, already in `.gitignore`)
holding `config.json` and `declaracoes/`, in several tabs, switching between pessoa,
leitor and adm, and with two admins editing the registry. Syntax-check standalone
JS with `node --check`. When touching `sw.js` or cached assets, use a hard reload —
a stale version in `versao.js` will serve the previous cache and hide your change.

## Do not

- Add build tooling, package managers, frameworks, or remote assets.
- Create per-version folders or dated copies of files — versions are tags.
- Rename persisted keys or role names, or reuse the reserved ones.
- Write the version number anywhere but `versao.js`, or bump it without tagging.
- Rewrite or migrate JSON files that users already have in the network folder.
- Let anyone write another person's declaration file, administrators included.
- Turn declared hours into a metric, a ranking, or a compliance check.
- Write English into the UI, comments, or LEIA-ME.
- **Commit internal data.** The repository is public: no real person's name, no
  password (not even hashed), no `config.json`, no declaration file. `catalogo.js`
  is an empty seed. Examples use the invented cast (Helena Barros, Ana Beatriz
  Nunes, Carlos Eduardo Prado, Marina Duarte, Roberto Aguiar).

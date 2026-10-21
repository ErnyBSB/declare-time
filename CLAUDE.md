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
5. **Accessible and dependency-light.** Native elements first. There is **no
   library at all**: the panel charts are plain HTML/CSS (decision 12.6) — do not
   bring ECharts or any other chart library back.

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
  icons/                 icon-192.png, icon-512.png — required for offline install
  LEIA-ME.txt            the real documentation: what changed and WHY
testes/                  end-to-end browser tests (dev tooling, not part of the app)
  rodar.mjs              runner: node testes/rodar.mjs [prefixes…]
  navegador.mjs          harness: static server, headless Chrome over CDP, OPFS folder
  NN-*.mjs               one suite per version (01-entrada … 05-ausencias)
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
meaning — **green is a current declaration** — so do not reuse it decoratively. The
gold token was removed in v0.5 along with the jornada (decision 12.9). Keep
`[hidden]{display:none !important}`.

## Domain model

- **Roles are cumulative and come from `config.json`**, never from a screen choice.
  Everyone registered is a `pessoa` and declares only for themselves. `leitor`
  (a list of units) and `adm` (`true`) are attributes inside `pessoas[nome]`. Many
  leitores per unit, many admins. The last `adm` cannot be removed.
- **Declaration** (`project_design.md` 5.1): period `de`…`ate` (`ate: null` = open
  ended), weekdays `dias` (0 = Sunday), one range `inicio`–`fim` per declaration
  (split shifts are two declarations; crossing midnight is refused), `unidade`
  stamped as a snapshot. There is **no jornada** since v0.5 (12.9): never ask for it;
  `cargaHoraria`/`carga` in old files are left untouched and unread.
- **Collision** only when period + weekday + hour all overlap.
- **Lifecycle**: delete only before it starts (`de` > today); end a current one by
  setting `ate` to today or later (only shortening); never edit one that has started;
  "substituir" ends the current on the eve of the new start (today or later) and
  creates the new one in a single write. Status (vigente/futura/encerrada) is
  computed against today, never stored.
- **Panel** (leitor and adm, scoped by `unidadesVisiveis()`): declarations are
  attributed to the **file owner** (registry name whose slug is the file name), never
  to the `pessoa` field inside; invalid declarations are skipped, not fatal, and kept
  in the file. Table filters by the stamped unit, "sem declaração" by the current
  registry unit; unreadable files are never counted as "sem declaração". CSV cells
  starting with `= + - @` are prefixed with `'`.
- **Charts** (panel, v0.4) are HTML/CSS fed by the same `recortePainel()` as the
  table and CSV — never a second computation. Coverage counts distinct people per
  weekday-hour (whole hour), on a validated single-green ramp with zero in grey;
  bars are neutral ink, one series; weekly hours only
  in date mode. Tooltips use `textContent` and also show on keyboard focus.
- **Absences** (`ausencias`, v0.5) live in the person's file: `{id, pessoa, unidade,
  tipo, de, ate, obs, criadaEm}`, `tipo` from `TIPOS_AUSENCIA` keys in `catalogo.js`
  (never rename a key), `ate` required, no overlap between one person's absences,
  same end/delete lifecycle as declarations. They never end declarations. In the
  panel they remove the person from coverage on the reference date only (the grid
  keeps its hours so uncovered hours show as zero); in month mode nobody is removed.
- **Reserved name**, not used in 1.0: key `realizados`.

## Verifying changes

**Run the browser tests before every PR:** `node testes/rodar.mjs` (all suites) or
`node testes/rodar.mjs 03` (by prefix). They need Node 22+ and Chrome or Edge
(`CHROME=/path` if it is not found), use only Node built-ins — never add npm
packages — and fail on any console error in the page. They serve `code/` on a
local port, drive headless Chrome over the DevTools Protocol, and replace only the
folder picker and permission prompt: the network folder is the browser's OPFS, so
the real `rede.js` reads and writes real files. `FOTOS=/some/dir` saves
screenshots for a visual check; look at them after any layout change.

**The file contract is frozen for v1.0** (`project_design.md` 5.6, checked by
`testes/06-contrato.mjs`): only add keys, never rename, retype or reuse one, never
migrate files, and a `formato` > 1 file is never written over. A new key means
updating the 5.6 table and that suite in the same PR.

**When behavior changes, change the tests in the same PR.** Add checks to the suite
of the area you touched, or a new `NN-name.mjs` suite exporting `nome`, `opcoes`
(`downloads`, `foco`) and a default `async function (t)`. Test data uses the
invented cast only.

The tests do not replace a manual pass: open `code/index.html` in Chrome against a
local test folder (`pasta-teste/`, already in `.gitignore`) holding `config.json`
and `declaracoes/`, in several tabs, switching between pessoa, leitor and adm, and
with two admins editing the registry. When touching `sw.js` or cached assets, use a
hard reload — a stale version in `versao.js` will serve the previous cache and hide
your change.

## Do not

- Add build tooling, package managers, frameworks, or remote assets — in the app or
  in `testes/` (Node built-ins only).
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

/* =========================================================
   NAVEGADOR — o que os testes têm em comum.

   Sobe um servidor HTTP mínimo para a pasta code/ e um Chrome sem tela
   (headless), conversa com ele pelo DevTools Protocol e entrega aos
   testes um punhado de ajudantes. Só módulos do próprio Node: nada de
   npm, como no resto do projeto.

   A pasta da rede é simulada com o OPFS do Chrome
   (navigator.storage.getDirectory()), que tem a mesma API de handles da
   File System Access API. Assim o rede.js de verdade lê e grava arquivos
   de verdade, e só o seletor de pasta e o pedido de permissão são
   trocados (ver MOCK).

   Cada suíte ganha um Chrome novo, com perfil descartável: o OPFS de uma
   não vaza para a outra.
   ========================================================= */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, resolve, normalize, delimiter, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CODE = resolve(fileURLToPath(new URL("../code/", import.meta.url)));
export const dorme = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- servidor estático da pasta code/ ---------- */
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".json": "application/json",
  ".png": "image/png", ".txt": "text/plain; charset=utf-8"
};
function servir() {
  const srv = createServer((req, res) => {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const arq = normalize(join(CODE, caminho === "/" ? "index.html" : caminho));
    // Nada fora de code/: o servidor só existe para os testes, mas não abre a casa.
    if (!(arq + sep).startsWith(CODE + sep) && arq !== CODE) { res.writeHead(403).end(); return; }
    if (!existsSync(arq) || !statSync(arq).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": TIPOS[extname(arq)] || "application/octet-stream" });
    res.end(readFileSync(arq));
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

/* ---------- onde está o Chrome ---------- */
function acharChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const absolutos = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ];
  for (const a of absolutos) if (existsSync(a)) return a;
  for (const nome of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"])
    for (const dir of (process.env.PATH || "").split(delimiter))
      if (dir && existsSync(join(dir, nome))) return join(dir, nome);
  throw new Error("Chrome ou Edge não encontrado. Indique o caminho em CHROME=/caminho/do/navegador.");
}

/* Instalado antes de qualquer script da página, a cada carregamento. */
const MOCK = `
  window.confirm = () => true;
  FileSystemHandle.prototype.queryPermission = async () => "granted";
  FileSystemHandle.prototype.requestPermission = async () => "granted";
  window.showDirectoryPicker = async () => {
    const r = await navigator.storage.getDirectory();
    return r.getDirectoryHandle("pasta", { create: true });
  };
  window.__pasta = async () => (await navigator.storage.getDirectory()).getDirectoryHandle("pasta", { create: true });
  window.__ler = async (caminho) => {
    let d = await window.__pasta(); const partes = caminho.split("/");
    for (const p of partes.slice(0, -1)) d = await d.getDirectoryHandle(p);
    return (await (await d.getFileHandle(partes.at(-1))).getFile()).text();
  };
  window.__gravar = async (caminho, texto) => {
    let d = await window.__pasta(); const partes = caminho.split("/");
    for (const p of partes.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
    const w = await (await d.getFileHandle(partes.at(-1), { create: true })).createWritable();
    await w.write(texto); await w.close();
  };
`;
/* Opcional: guarda os CSV baixados para o teste ler, sem salvar nada. */
const MOCK_DOWNLOADS = `
  window.__blobs = []; const __orig = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => { window.__blobs.push(b); return __orig(b); };
  HTMLAnchorElement.prototype.click = function () {};
`;

/* ---------- uma sessão de navegador para uma suíte ---------- */
export async function abrirNavegador({ downloads = false, foco = false } = {}) {
  const srv = await servir();
  const portaHttp = srv.address().port;
  const perfil = mkdtempSync(join(tmpdir(), "dt-teste-"));
  const chrome = spawn(acharChrome(), ["--headless=new", "--remote-debugging-port=0",
    `--user-data-dir=${perfil}`, "--no-first-run", "--no-default-browser-check", "about:blank"],
    { stdio: "ignore" });
  const saiu = new Promise((ok) => chrome.on("exit", ok));

  /* Com porta 0 o Chrome escolhe uma livre e a anota neste arquivo. */
  let portaCdp = null;
  for (let i = 0; i < 100 && !portaCdp; i++) {
    try { portaCdp = readFileSync(join(perfil, "DevToolsActivePort"), "utf8").split("\n")[0].trim(); }
    catch { await dorme(100); }
  }
  if (!portaCdp) throw new Error("o Chrome não abriu a porta de depuração");

  let ws = null, seq = 0;
  const pend = new Map(), erros = [];
  for (let i = 0; i < 50 && !ws; i++) {
    try {
      const alvos = await (await fetch(`http://127.0.0.1:${portaCdp}/json`)).json();
      const pg = alvos.find(t => t.type === "page");
      if (pg) {
        const s = new WebSocket(pg.webSocketDebuggerUrl);
        await new Promise((ok, err) => { s.onopen = ok; s.onerror = err; });
        ws = s;
      }
    } catch {}
    if (!ws) await dorme(200);
  }
  if (!ws) throw new Error("não foi possível falar com o Chrome");
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown")
      erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error")
      erros.push("console.error: " + d.params.args.map(a => a.value ?? a.description).join(" "));
  };
  const cmd = (method, params = {}) => new Promise((ok) => {
    const id = ++seq; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params }));
  });
  async function ev(expr) {
    const r = await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails)
      throw new Error("eval: " + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    return r.result?.result?.value;
  }

  await cmd("Runtime.enable");
  await cmd("Page.enable");
  /* Sem janela com foco, .focus() não dispara focusin no headless. */
  if (foco) await cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await cmd("Page.addScriptToEvaluateOnNewDocument", { source: MOCK + (downloads ? MOCK_DOWNLOADS : "") });

  const t = {
    falhas: 0, oks: 0, erros, cmd, ev, dorme,
    confere(cond, msg) {
      console.log((cond ? "  ok    " : "  FALHA ") + msg);
      if (cond) t.oks++; else t.falhas++;
    },
    vis: (id) => `!document.getElementById("${id}").hidden`,
    txt: (id) => `document.getElementById("${id}").textContent`,
    aviso: (id) => `(getComputedStyle(document.getElementById("${id}")).display !== "none" ? document.getElementById("${id}").textContent : "")`,
    clica: (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click()`),
    valor: (id, v) => ev(`document.getElementById("${id}").value = ${JSON.stringify(v)}`),
    async abrir() {
      await cmd("Page.navigate", { url: `http://127.0.0.1:${portaHttp}/index.html` });
      await dorme(1200);
    },
    /* Capturas só com FOTOS=<pasta>: servem para olhar o layout, não
       para passar ou falhar. */
    async foto(nome, largura = 1280, altura = 900) {
      if (!process.env.FOTOS) return;
      mkdirSync(process.env.FOTOS, { recursive: true });
      await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: false });
      await dorme(300);
      const r = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(join(process.env.FOTOS, nome + ".png"), Buffer.from(r.result.data, "base64"));
      await cmd("Emulation.clearDeviceMetricsOverride");
    },
    async fechar() {
      try { ws.close(); } catch {}
      chrome.kill();
      await Promise.race([saiu, dorme(3000)]);
      srv.close();
      try { rmSync(perfil, { recursive: true, force: true }); } catch {}
    }
  };
  return t;
}

/* Service worker — funcionamento offline.
   Cache-first para o programa; REDE-first para o catalogo.js, que é
   dado editável e não parte do programa (ver o bloco antes do "fetch").
   A chave do cache vem do versao.js, o único lugar onde a versão do
   aplicativo é escrita: a versão "0.1" vira o cache "dt-0.1". Trocar a
   versão lá é o que faz os navegadores baixarem os arquivos novos —
   sem isso, quem já abriu o aplicativo continua recebendo a tela
   antiga. Aqui não há número a lembrar de atualizar. */
importScripts("./versao.js");
const PREFIXO = "dt-";
const VERSAO = PREFIXO + APP.versao;
const ARQUIVOS = [
  "./",
  "./index.html",
  "./versao.js",
  "./catalogo.js",
  "./rede.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

/* Só apaga caches que comecem com "dt-". O projeto de origem apagava
   todo cache de nome diferente do seu; servido da mesma origem que
   ele, um apagaria o cache offline do outro a cada versão publicada. */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k.startsWith(PREFIXO) && k !== VERSAO)
                    .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ---------- O catalogo.js é dado, e não programa ---------- */
/* Servi-lo primeiro do cache, como se fosse parte do programa,
   congelaria a edição até a publicação de uma versão nova — e congelaria
   calado, porque catálogo velho é idêntico a catálogo certo na tela.

   Aqui a lógica se inverte só para ele: tenta a rede, guarda no cache o
   que voltar, e cai no cache quando a rede falta. O uso offline
   continua inteiro, porque o cache É o plano B.

   O prazo existe porque sem ele esta seria a ÚNICA requisição capaz de
   travar a abertura: as demais saem do cache sem tocar a rede, e um
   servidor que aceita a conexão e não responde deixaria a tela em
   branco. Servir catálogo velho é ruim; não abrir é pior. */
const REDE_PRAZO = 2500;

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error("prazo esgotado")), ms);
    promessa.then(
      (v) => { clearTimeout(t); ok(v); },
      (e) => { clearTimeout(t); falha(e); }
    );
  });
}

async function catalogoRedePrimeiro(req) {
  try {
    const r = await comPrazo(fetch(req), REDE_PRAZO);
    /* Só guarda resposta boa. Gravar um 404 ou um 500 no cache
       transformaria uma falha de um instante em falha permanente. */
    if (r && r.ok) {
      const copia = r.clone();
      caches.open(VERSAO).then((c) => c.put(req, copia));
    }
    return r;
  } catch {
    const doCache = await caches.match(req, { ignoreSearch: true });
    if (doCache) return doCache;
    throw new Error("catalogo.js: sem rede e sem cópia no cache");
  }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).pathname.endsWith("/catalogo.js")) {
    e.respondWith(catalogoRedePrimeiro(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (r) => r || fetch(e.request)
    )
  );
});

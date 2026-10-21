/* =========================================================
   REDE — acesso à pasta compartilhada via File System Access API
   (Chrome e Edge).

   Estrutura esperada dentro da pasta da rede:
     config.json                  (só administradores gravam)
     declaracoes/<pessoa>.json    (cada pessoa grava só o seu)

   Padrão "um arquivo, um único escritor": cada arquivo de declaração
   tem uma só pessoa que o grava, sem exceção. O config.json tem um só
   PAPEL escritor, mas pode ter vários administradores; por isso a
   gravação dele confere, antes, se ninguém o alterou (gravarConfig).

   Podado do rede.js do projeto de origem (Programa de Resultados v1.16):
   saíram lançamentos, aprovações, ausências e a pasta por unidade.
   ========================================================= */
"use strict";

/* ---------- IndexedDB: guarda o handle da pasta entre sessões ----------
   Base "dt-rede", e não "ra-rede": os dois aplicativos podem acabar
   servidos da mesma origem, e aí dividiriam a mesma base. */
function _idb() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open("dt-rede", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("handles");
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function salvarHandleRaiz(handle) {
  const db = await _idb();
  await new Promise((res, rej) => {
    const tx = db.transaction("handles", "readwrite");
    tx.objectStore("handles").put(handle, "raiz");
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function obterHandleRaiz() {
  const db = await _idb();
  return new Promise((res) => {
    const rq = db.transaction("handles").objectStore("handles").get("raiz");
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  });
}

/* ---------- Permissões ---------- */
async function garantirPermissao(handle, modo /* "read" | "readwrite" */, pedir = true) {
  const opts = { mode: modo };
  if (await handle.queryPermission(opts) === "granted") return true;
  if (!pedir) return false;
  return (await handle.requestPermission(opts)) === "granted";
}

/* ---------- Utilitários de arquivo ---------- */
/* O nome do arquivo de cada pessoa sai daqui. Dois nomes com o mesmo
   slug cairiam no mesmo arquivo — por isso o cadastro recusa um nome
   cujo slug já esteja em uso (ver Administração, no index.html). */
function slug(nome) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "")
             .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const arquivoDe = (nome) => slug(nome) + ".json";

async function lerJSONDe(dir, nomeArquivo) {
  try {
    const fh = await dir.getFileHandle(nomeArquivo);
    const texto = await (await fh.getFile()).text();
    return texto.trim() ? JSON.parse(texto) : null;
  } catch { return null; }
}
async function gravarJSONEm(dir, nomeArquivo, obj) {
  const fh = await dir.getFileHandle(nomeArquivo, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(obj, null, 2));
  await w.close();
}
async function pastaDeclaracoes(raiz, criar = false) {
  return raiz.getDirectoryHandle("declaracoes", { create: criar });
}

/* ---------- Arquivo de uma pessoa ---------- */
/* Leitura ESTRITA, obrigatória antes de qualquer gravação.

   A leitura indulgente devolve null tanto para "o arquivo não existe"
   quanto para "o arquivo existe mas está ilegível" — e regravar em cima
   do segundo caso apaga as declarações da pessoa. Aqui os dois casos
   são separados:

     não existe (ou está vazio)  -> null, pode criar à vontade
     existe e não decifra        -> lança erro, NÃO grave por cima

   O erro leva a marca .arquivoIlegivel para que a tela mostre o texto
   como está, sem prefixo de "falha ao gravar": não houve falha de
   gravação, houve recusa deliberada de gravar. */
async function lerArquivoParaGravar(raiz, nome) {
  const arquivo = arquivoDe(nome);
  let fh;
  try {
    const dir = await pastaDeclaracoes(raiz);
    fh = await dir.getFileHandle(arquivo);
  } catch (e) {
    // só "não encontrado" é seguro tratar como pasta/arquivo novo;
    // falta de permissão e afins têm de subir
    if (e && e.name === "NotFoundError") return null;
    throw e;
  }
  const texto = await (await fh.getFile()).text();
  if (!texto.trim()) return null;   // vazio: não há declaração a perder

  const recusa = (motivo) => {
    const e = new Error(
      `O arquivo declaracoes/${arquivo} ${motivo}. Gravar por cima apagaria as ` +
      `declarações já feitas, então nada foi gravado. Peça a um administrador ` +
      `para conferir esse arquivo na pasta da rede.`);
    e.arquivoIlegivel = true;
    return e;
  };
  let dado;
  try { dado = JSON.parse(texto); }
  catch { throw recusa("existe mas está ilegível (JSON inválido)"); }
  if (!dado || typeof dado !== "object" || !Array.isArray(dado.declaracoes))
    throw recusa("não tem a lista de declarações no formato esperado");
  /* Formato mais novo que este programa: regravar como formato 1
     apagaria o que a versão nova quis dizer (project_design.md, 5.6). */
  if (typeof dado.formato === "number" && dado.formato > 1) {
    const e = new Error(
      `O arquivo declaracoes/${arquivo} foi gravado por uma versão mais nova do ` +
      `programa (formato ${dado.formato}). Esta versão não o entende e não grava por ` +
      `cima dele. Use a versão mais nova, ou peça a um administrador para atualizar a ` +
      `cópia do programa neste computador.`);
    e.arquivoIlegivel = true;
    throw e;
  }
  return dado;
}

/* Grava o arquivo inteiro. Só a atualizarArquivoPessoa, no index.html,
   chama isto: ela é o ponto único de escrita e monta o estado completo.

   O ...estado vem PRIMEIRO de propósito: uma chave que esta versão não
   conhece (gravada por uma versão mais nova, como as reservadas
   "realizados" e "ausencias") atravessa a gravação intacta, em vez de
   ser apagada por quem não sabia que ela existia. */
async function gravarArquivoPessoa(raiz, estado) {
  const dir = await pastaDeclaracoes(raiz, true);
  await gravarJSONEm(dir, arquivoDe(estado.pessoa), {
    ...estado,
    formato: 1,
    pessoa: estado.pessoa,
    unidade: estado.unidade,
    atualizadoEm: new Date().toISOString(),
    declaracoes: estado.declaracoes || []
  });
}

/* Todos os arquivos de declaração da pasta, para o painel (v0.3).
   Arquivo ilegível NÃO some: volta com dado null e o motivo, para que
   o painel possa dizer que ele existe e não pôde ser lido, em vez de
   contar a pessoa como "sem declaração". */
async function lerTodasDeclaracoes(raiz) {
  const lista = [];
  let dir;
  try { dir = await pastaDeclaracoes(raiz); }
  catch { return lista; }   // ninguém declarou ainda: não há pasta
  for await (const [nome, handle] of dir.entries()) {
    if (handle.kind !== "file" || !nome.endsWith(".json")) continue;
    try {
      const dado = JSON.parse(await (await handle.getFile()).text());
      if (!dado || !Array.isArray(dado.declaracoes))
        lista.push({ arquivo: nome, dado: null, motivo: "formato inesperado" });
      else lista.push({ arquivo: nome, dado, motivo: null });
    } catch (e) {
      lista.push({ arquivo: nome, dado: null, motivo: e.message });
    }
  }
  return lista;
}

/* ---------- Configuração central (config.json na raiz) ---------- */
/* O config.json é o arquivo em que "não existe" e "existe mas não dá
   para ler" mais precisam ser respostas DIFERENTES. No projeto de
   origem, confundi-los fez o programa anunciar pasta virgem; o
   administrador acreditava e oficializava, e a oficialização gravava a
   semente vazia por cima do cadastro real.

   Devolve { estado, dados, motivo }, com estado em:
     "ausente"  — não há config.json; pasta nova, pode ser oficializada;
     "ilegivel" — o arquivo está lá (ou não deu para saber) e não pôde
                  ser lido ou entendido;
     "ok"       — leu e tem a cara de um cadastro.

   Arquivo vazio conta como ilegível, e não como ausente: zero byte é o
   que sobra de uma gravação interrompida, justamente a hora em que
   oficializar por cima seria o pior a fazer. Pelo mesmo motivo, só
   NotFoundError vale como ausente: falta de permissão não é pasta nova. */
async function lerConfig(raiz) {
  let fh;
  try {
    fh = await raiz.getFileHandle("config.json");
  } catch (e) {
    if (e && e.name === "NotFoundError")
      return { estado: "ausente", dados: null, motivo: null };
    return { estado: "ilegivel", dados: null, motivo: (e && e.message) || "acesso negado" };
  }
  try {
    const texto = await (await fh.getFile()).text();
    if (!texto.trim())
      return { estado: "ilegivel", dados: null, motivo: "o arquivo está vazio" };
    const dados = JSON.parse(texto);
    if (!dados || typeof dados !== "object" || Array.isArray(dados))
      return { estado: "ilegivel", dados: null, motivo: "o conteúdo não é um objeto JSON" };
    if (!Array.isArray(dados.unidades))
      return { estado: "ilegivel", dados: null, motivo: 'falta a lista "unidades"' };
    if (!dados.pessoas || typeof dados.pessoas !== "object" || Array.isArray(dados.pessoas))
      return { estado: "ilegivel", dados: null, motivo: 'falta o mapa "pessoas"' };
    return { estado: "ok", dados, motivo: null };
  } catch (e) {
    return { estado: "ilegivel", dados: null, motivo: e.message };
  }
}

/* Grava o config.json conferindo, antes, que ele é o mesmo que a tela
   leu. Com vários administradores, sem esta conferência o segundo a
   salvar apagaria em silêncio a mudança do primeiro.

     esperado = null       -> oficialização: o arquivo NÃO pode existir;
     esperado = "<iso>"    -> o atualizadoEm lido quando a tela carregou.

   Se não conferir, lança com a marca .configAlterado e nada é gravado.
   A janela entre esta releitura e a escrita continua existindo — duas
   gravações no mesmo instante ainda se sobrepõem —, mas fica da ordem
   de milissegundos, e não do tempo de uma tela aberta. Devolve o que
   foi gravado, com o atualizadoEm novo. */
async function gravarConfig(raiz, cfg, esperado) {
  const atual = await lerConfig(raiz);
  const recusa = (msg) => { const e = new Error(msg); e.configAlterado = true; return e; };
  if (esperado === null) {
    if (atual.estado !== "ausente")
      throw recusa("Já existe um config.json nesta pasta — ela não é nova. Nada foi gravado.");
  } else {
    if (atual.estado === "ilegivel")
      throw recusa("O config.json não pôde ser relido antes de gravar (" + atual.motivo +
        "). Nada foi gravado.");
    if (atual.estado === "ausente" || atual.dados.atualizadoEm !== esperado)
      throw recusa("Outro administrador alterou o cadastro desde que esta tela o leu. " +
        "Nada foi gravado: use “Atualizar dados da rede” e refaça a alteração.");
    if (typeof atual.dados.formato === "number" && atual.dados.formato > 1)
      throw recusa(`O config.json foi gravado por uma versão mais nova do programa ` +
        `(formato ${atual.dados.formato}). Esta versão não grava por cima dele.`);
  }
  const novo = { ...cfg, formato: 1, atualizadoEm: new Date().toISOString() };
  await gravarJSONEm(raiz, "config.json", novo);
  return novo;
}

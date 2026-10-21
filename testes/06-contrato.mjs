/* =========================================================
   06 — Contrato dos arquivos (v1.0)

   Grava pela tela cada tipo de dado — cadastro, papéis, senha,
   declaração, ausência — e confere os arquivos contra a tabela de
   project_design.md, 5.6: nenhuma chave fora da lista, as obrigatórias
   presentes, chave desconhecida preservada, e recusa de gravar por cima
   de um formato mais novo.

   Se este teste falhar porque uma chave nova entrou de propósito, a
   tabela 5.6 tem de mudar junto — e a chave nova tem de obedecer às
   regras de lá.

   Roda com: node testes/rodar.mjs 06
   ========================================================= */
export const nome = "Contrato dos arquivos (v1.0)";
export const opcoes = { foco: true };

const CONTRATO = {
  config:     ["formato", "atualizadoEm", "unidades", "pessoas", "senhas", "exigirSenha", "instalacao"],
  pessoa:     ["unidade", "leitor", "adm"],
  instalacao: ["id", "por", "em"],
  arquivo:    ["formato", "pessoa", "unidade", "atualizadoEm", "declaracoes", "ausencias"],
  declaracao: ["id", "pessoa", "unidade", "de", "ate", "dias", "inicio", "fim", "obs", "criadaEm"],
  ausencia:   ["id", "pessoa", "unidade", "tipo", "de", "ate", "obs", "criadaEm"]
};

export default async function (t) {
  const { ev, dorme, confere, vis, aviso, clica, valor } = t;
  const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
  const ler = async (c) => JSON.parse(await ev(`__ler(${JSON.stringify(c)})`));
  const grava = (c, o) => ev(`__gravar(${JSON.stringify(c)}, ${JSON.stringify(JSON.stringify(o))})`);
  const fora = (obj, lista) => Object.keys(obj).filter(k => !lista.includes(k));
  const confereChaves = (obj, lista, obrig, rotulo) => {
    const extras = fora(obj, lista), faltam = obrig.filter(k => !(k in obj));
    confere(!extras.length && !faltam.length,
      `${rotulo}: só chaves do contrato` + (extras.length ? ` — fora: ${extras}` : "") + (faltam.length ? ` — faltam: ${faltam}` : ""));
  };

  console.log("1. Gravar cada tipo de dado pela tela");
  await clica("#btnPasta"); await dorme(500);
  await valor("inpOfNome", "Roberto Aguiar"); await valor("inpOfUnidade", "SEORE");
  await valor("inpOfSenha", "1234"); await valor("inpOfSenha2", "1234");
  await clica("#btnIniciar"); await dorme(900);
  await clica("#navAdm"); await dorme(200);
  await valor("inpNovaUnidade", "SEACE"); await clica("#btnNovaUnidade"); await dorme(400);
  await valor("inpNovaPessoa", "Ana Beatriz Nunes"); await valor("selNovaPessoaUnidade", "SEACE");
  await clica("#btnNovaPessoa"); await dorme(400);
  const iAna = await ev(`pessoasAdm.indexOf("Ana Beatriz Nunes")`);
  await clica(`[data-acao="leitor"][data-i="${iAna}"]`); await dorme(200);
  await ev(`document.querySelectorAll("#leitorUnidades input").forEach(c => c.checked = true)`);
  await clica("#btnLeitorSalvar"); await dorme(500);
  await clica(`[data-acao="adm"][data-i="${iAna}"]`); await dorme(300);
  await valor("inpSenha1", "abcd"); await valor("inpSenha2", "abcd");
  await clica('#formSenha button[type="submit"]'); await dorme(500);
  await ev(`document.getElementById("chkExigirSenha").click()`); await dorme(500);

  await clica("#navHor"); await dorme(500);
  await ev(`document.getElementById("inpDe").value = "${iso(0)}"; marcarDias([1, 2, 3]);
    document.getElementById("inpInicio").value = "09:00"; document.getElementById("inpFim").value = "15:00";
    document.getElementById("inpObs").value = "teste de contrato"`);
  await clica("#btnDeclarar"); await dorme(500);
  await valor("selAusTipo", "recesso"); await valor("inpAusDe", iso(20)); await valor("inpAusAte", iso(25));
  await clica("#btnAus"); await dorme(500);

  console.log("2. config.json");
  const cfg = await ler("config.json");
  confereChaves(cfg, CONTRATO.config, ["unidades", "pessoas"], "config.json");
  confere(cfg.formato === 1 && Array.isArray(cfg.unidades) && cfg.pessoas && !Array.isArray(cfg.pessoas), "formato 1, unidades lista, pessoas mapa");
  for (const [n, p] of Object.entries(cfg.pessoas)) confereChaves(p, CONTRATO.pessoa, ["unidade"], `pessoas["${n}"]`);
  confere(Array.isArray(cfg.pessoas["Ana Beatriz Nunes"].leitor) && cfg.pessoas["Ana Beatriz Nunes"].adm === true, "papéis gravados como leitor (lista) e adm (true)");
  confereChaves(cfg.instalacao, CONTRATO.instalacao, ["id"], "instalacao");
  confere(cfg.exigirSenha === true && Object.values(cfg.senhas).every(h => /^[0-9a-f]{64}$/.test(h)), "senhas só como hash sha-256");

  console.log("3. Arquivo da pessoa, declaração, ausência");
  const arq = await ler("declaracoes/roberto-aguiar.json");
  confereChaves(arq, CONTRATO.arquivo, ["declaracoes"], "declaracoes/roberto-aguiar.json");
  confere(arq.formato === 1 && !("cargaHoraria" in arq), "formato 1, sem cargaHoraria");
  confereChaves(arq.declaracoes[0], CONTRATO.declaracao, ["de", "dias", "inicio", "fim"], "declaração");
  confere(arq.declaracoes[0].ate === null && JSON.stringify(arq.declaracoes[0].dias) === "[1,2,3]", "ate null = sem fim; dias como números");
  confereChaves(arq.ausencias[0], CONTRATO.ausencia, ["tipo", "de", "ate"], "ausência");
  confere(arq.ausencias[0].tipo === "recesso", "tipo gravado pela chave, não pelo rótulo");

  console.log("4. Chave desconhecida atravessa a gravação");
  arq.extraFuturo = { v: 1 };
  arq.declaracoes[0].extraItem = "fica";
  await grava("declaracoes/roberto-aguiar.json", arq);
  const cfg2 = await ler("config.json");
  cfg2.extraFuturo = "fica"; cfg2.pessoas["Roberto Aguiar"].extraPessoa = 7;
  await grava("config.json", cfg2);
  await clica("#btnAtualizar"); await dorme(700);
  await valor("selAusTipo", "ferias"); await valor("inpAusDe", iso(40)); await valor("inpAusAte", iso(41));
  await clica("#btnAus"); await dorme(500);
  const arq2 = await ler("declaracoes/roberto-aguiar.json");
  confere(arq2.extraFuturo?.v === 1 && arq2.declaracoes[0].extraItem === "fica" && arq2.ausencias.length === 2,
    "arquivo da pessoa: chaves desconhecidas preservadas (topo e item)");
  await clica("#navAdm"); await dorme(200);
  await valor("inpNovaUnidade", "SEDIN"); await clica("#btnNovaUnidade"); await dorme(500);
  const cfg3 = await ler("config.json");
  confere(cfg3.unidades.includes("SEDIN") && cfg3.extraFuturo === "fica" && cfg3.pessoas["Roberto Aguiar"].extraPessoa === 7,
    "config.json: chaves desconhecidas preservadas (topo e pessoa)");

  console.log("5. Formato mais novo: não grava por cima");
  const novo = { ...arq2, formato: 2 };
  await grava("declaracoes/roberto-aguiar.json", novo);
  await clica("#btnAtualizar"); await dorme(700);
  await clica("#navHor"); await dorme(500);
  confere((await ev(`document.getElementById("listaMinhas").textContent`)).includes("versão mais nova") &&
    await ev(`document.getElementById("btnDeclarar").disabled`), "arquivo de formato 2: tela avisa e desliga as gravações");
  confere((await ler("declaracoes/roberto-aguiar.json")).formato === 2, "arquivo de formato 2 ficou intacto");
  await grava("config.json", { ...cfg3, formato: 2 });
  await clica("#btnAtualizar"); await dorme(700);
  await clica("#navAdm"); await dorme(200);
  await valor("inpNovaUnidade", "SENOV"); await clica("#btnNovaUnidade"); await dorme(500);
  confere((await ev(aviso("avisoUnidades"))).includes("versão mais nova") &&
    !(await ler("config.json")).unidades.includes("SENOV"), "config.json de formato 2: Administração não grava por cima");
  confere(await ev(vis("vAdm")), "a tela continua de pé");
}

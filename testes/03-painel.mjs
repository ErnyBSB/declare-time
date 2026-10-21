/* =========================================================
   03 — Painel (v0.3)

   Indicadores, "sem declaração" pelo cadastro, atribuição pelo dono do arquivo, filtros
   por data, mês, unidade e pessoa, o recorte do leitor e o CSV (BOM, fórmulas).

   Roda com: node testes/rodar.mjs 03
   ========================================================= */
export const nome = "Painel (v0.3)";
export const opcoes = { downloads: true };

export default async function (t) {
  const { ev, cmd, dorme, confere, vis, txt, aviso, clica, valor, abrir, foto } = t;
  const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
  const HOJE = iso(0);
  const MES_QUE_VEM = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString("sv").slice(0, 7); })();
  const decl = (o) => ({ id: "dec-" + Math.random().toString(36).slice(2), carga: 8, ate: null, obs: "",
    dias: [1, 2, 3, 4, 5], criadaEm: new Date().toISOString(), ...o });
  const arquivo = (pessoa, unidade, carga, declaracoes) =>
    JSON.stringify({ formato: 1, pessoa, unidade, cargaHoraria: carga, atualizadoEm: new Date().toISOString(), declaracoes });
  const grava = (c, t) => ev(`__gravar(${JSON.stringify(c)}, ${JSON.stringify(t)})`);
  const kpis = () => ev(`[...document.querySelectorAll("#kpis .kpi .valor")].map(v => v.textContent.trim())`);
  const linhas = () => ev(`[...document.querySelectorAll("#tbodyPainel tr")].map(tr => tr.cells[0].childNodes[0].textContent.trim()).filter(t => t)`);
  async function entrarComo(nome, senha = "") {
    await ev(`window.confirm = () => true`);
    if (await ev(vis("btnTrocar"))) { await clica("#btnTrocar"); await dorme(400); }
    await valor("selPessoa", nome); await ev(`aoTrocarPessoa()`); await dorme(300);
    if (senha) await valor("inpSenha", senha);
    await clica("#btnIniciar"); await dorme(800);
  }


  console.log("0. Preparação");
  confere(await ev(txt("versaoApp")) === await ev("APP.rotulo"), "versão do versao.js no rail");
  await clica("#btnPasta"); await dorme(500);
  await valor("inpOfNome", "Roberto Aguiar"); await valor("inpOfUnidade", "SEORE");
  await valor("inpOfSenha", "1234"); await valor("inpOfSenha2", "1234");
  await clica("#btnIniciar"); await dorme(900);
  const cfg = JSON.parse(await ev(`__ler("config.json")`));
  cfg.unidades = ["SEORE", "SEACE"];
  Object.assign(cfg.pessoas, {
    "Ana Beatriz Nunes": { unidade: "SEACE" },
    "Carlos Eduardo Prado": { unidade: "SEACE" },     // mudou de SEORE para SEACE
    "Marina Duarte": { unidade: "SEACE" },            // arquivo ilegível
    "Helena Barros": { unidade: "SEORE", leitor: ["SEACE"] }
  });
  await grava("config.json", JSON.stringify(cfg));
  await grava("declaracoes/roberto-aguiar.json", arquivo("Roberto Aguiar", "SEORE", 8, [
    decl({ pessoa: "Roberto Aguiar", unidade: "SEORE", de: iso(-40), inicio: "09:00", fim: "17:00" })]));
  await grava("declaracoes/ana-beatriz-nunes.json", arquivo("Ana Beatriz Nunes", "SEACE", 8, [
    // nome trocado à mão dentro do arquivo: tem de continuar sendo da Ana
    decl({ pessoa: "Roberto Aguiar", unidade: "SEACE", de: iso(-10), inicio: "09:00", fim: "15:00",
           obs: "=HYPERLINK(\"http://x\")" }),
    decl({ pessoa: "Ana Beatriz Nunes", unidade: "SEACE", de: MES_QUE_VEM + "-01", dias: [6], inicio: "09:00", fim: "12:00" }),
    { quebrada: true }]));
  await grava("declaracoes/carlos-eduardo-prado.json", arquivo("Carlos Eduardo Prado", "SEACE", 6, [
    decl({ pessoa: "Carlos Eduardo Prado", unidade: "SEORE", carga: 6, de: iso(-60), inicio: "13:00", fim: "19:00" })]));
  await grava("declaracoes/marina-duarte.json", "{ ilegível");
  await grava("declaracoes/joao-antigo.json", arquivo("João Antigo", "SEORE", 8, [
    decl({ pessoa: "João Antigo", unidade: "SEORE", de: iso(-5), inicio: "08:00", fim: "12:00" })]));
  await clica("#btnAtualizar"); await dorme(700);

  console.log("1. Rail e acesso");
  confere(await ev(vis("navPainel")) && await ev(vis("navAdm")), "adm vê Painel e Administração");
  await clica("#navPainel"); await dorme(800);
  confere(await ev(vis("vPainel")), "painel abre");

  console.log("2. Administrador, numa data (hoje)");
  confere(JSON.stringify(await kpis()) === JSON.stringify(["5", "3", "1", "100h", "0"]), "indicadores: " + JSON.stringify(await kpis()));
  confere((await ev(`document.querySelector("#kpis").textContent`)).includes("1 com arquivo ilegível"), "ilegível contado à parte");
  confere((await ev(`document.querySelector("#kpis").textContent`)).includes("média de 33h20"), "média por pessoa com declaração");
  confere(JSON.stringify(await linhas()) === JSON.stringify(["Ana Beatriz Nunes", "Carlos Eduardo Prado", "Roberto Aguiar"]),
    "tabela alfabética, atribuída pelo arquivo: " + JSON.stringify(await linhas()));
  confere(await ev(`!document.querySelector("#tbodyPainel .tag.diverge")`) &&
    !(await ev(`document.querySelector("#vPainel table thead").textContent`)).includes("Jornada"), "tabela sem coluna de jornada nem dourado");
  await clica("#btnFaltam"); await dorme(100);
  const faltam = await ev(`document.getElementById("listaFaltam").textContent`);
  confere(await ev(vis("cartaoFaltam")) && faltam.includes("Helena Barros") && faltam.includes("Marina Duarte") &&
    faltam.includes("arquivo ilegível") && !faltam.includes("Carlos"), "lista de quem falta, com o ilegível marcado");
  const atencao = await ev(`document.getElementById("tbodyArquivos").textContent`);
  confere(await ev(vis("cartaoArquivos")) && atencao.includes("joao-antigo.json") && atencao.includes("sem cadastro") &&
    atencao.includes("marina-duarte.json") && atencao.includes("ilegível"), "arquivos que pedem atenção (órfão e ilegível)");
  confere(!(await linhas()).includes("João Antigo"), "arquivo sem cadastro fica fora das contas");

  console.log("3. Filtros");
  await valor("selUnidadeVer", "SEORE"); await ev(`document.getElementById("selUnidadeVer").dispatchEvent(new Event("change"))`); await dorme(100);
  confere(JSON.stringify(await linhas()) === JSON.stringify(["Carlos Eduardo Prado", "Roberto Aguiar"]),
    "SEORE pela unidade carimbada (Carlos declarou quando era de SEORE)");
  confere(JSON.stringify(await kpis()).startsWith('["2"'), "cadastrados em SEORE pela unidade atual: Roberto e Helena");
  await valor("selUnidadeVer", "*"); await ev(`document.getElementById("selUnidadeVer").dispatchEvent(new Event("change"))`);
  await valor("selModo", "mes"); await ev(`document.getElementById("selModo").dispatchEvent(new Event("change"))`);
  await valor("inpRefMes", MES_QUE_VEM); await ev(`document.getElementById("inpRefMes").dispatchEvent(new Event("change"))`); await dorme(100);
  const kMes = await kpis();
  confere(kMes[3] === "—", "horas por semana não se somam num mês");
  confere((await linhas()).filter(n => n === "Ana Beatriz Nunes").length === 2, "no mês que vem entram a vigente e a futura da Ana");
  await valor("selModo", "data"); await ev(`document.getElementById("selModo").dispatchEvent(new Event("change"))`);
  await valor("inpRefData", iso(-50)); await ev(`document.getElementById("inpRefData").dispatchEvent(new Event("change"))`); await dorme(100);
  confere(JSON.stringify(await linhas()) === JSON.stringify(["Carlos Eduardo Prado"]), "numa data passada, só o que valia nela");
  await valor("inpRefData", HOJE); await ev(`document.getElementById("inpRefData").dispatchEvent(new Event("change"))`);

  console.log("4. CSV");
  await clica("#btnCSV"); await dorme(200);
  const csv = await ev(`window.__blobs.at(-1).text()`);
  const lin = csv.split("\r\n");
  const bytes = await ev(`window.__blobs.at(-1).arrayBuffer().then(b => [...new Uint8Array(b).slice(0, 3)])`);
  confere(JSON.stringify(bytes) === "[239,187,191]", "BOM UTF-8 nos primeiros bytes");
  confere(lin[0].includes('"Identificador";"Pessoa";"Unidade";"Primeiro dia"'), "cabeçalho na ordem do esquema, sem jornada");
  confere(lin.length === 4, "uma linha por declaração da tabela");
  confere(csv.includes(`"'=HYPERLINK(""http://x"")"`), "fórmula neutralizada com apóstrofo");
  confere(csv.includes('"Seg Ter Qua Qui Sex"'), "dias por extenso");

  console.log("5. Leitora de SEACE");
  await entrarComo("Helena Barros");
  confere(await ev(vis("navPainel")) && !(await ev(vis("navAdm"))), "leitora vê Painel e não Administração");
  await clica("#navPainel"); await dorme(800);
  confere(JSON.stringify(await linhas()) === JSON.stringify(["Ana Beatriz Nunes"]), "só declarações carimbadas com SEACE");
  const kL = await kpis();
  confere(kL[0] === "3" && kL[1] === "2" && kL[2] === "0", "SEACE: 3 cadastrados, 2 com declaração (Carlos conta), 0 sem: " + JSON.stringify(kL));
  confere((await ev(`document.querySelector("#kpis").textContent`)).includes("1 com declaração feita em outra unidade"), "indicador explica o Carlos fora da tabela");
  confere(!(await ev(vis("cartaoArquivos"))), "leitora não vê os arquivos fora do cadastro");
  confere(await ev(`[...document.getElementById("selUnidadeVer").options].map(o => o.value).join()`) === "*,SEACE", "filtro de unidade só com as dela");
  await foto("v03-painel", 1280, 1000);

  console.log("6. Quem só declara");
  await entrarComo("Ana Beatriz Nunes");
  confere((await ev(`document.getElementById("listaMinhas").textContent`)).includes("1 item(ns)"), "item malformado avisado em Meus horários");
  const ana = JSON.parse(await ev(`__ler("declaracoes/ana-beatriz-nunes.json")`));
  confere(ana.declaracoes.some(d => d.quebrada === true), "item malformado continua no arquivo");
  confere(!(await ev(vis("navPainel"))), "pessoa comum não vê o Painel");
  await ev(`irPara("painel")`);
  confere(!(await ev(vis("vPainel"))), "podeVer barra o Painel");

  console.log("7. Painel do administrador no celular");
  await entrarComo("Roberto Aguiar", "1234");
  await clica("#navPainel"); await dorme(800);
  await foto("v03-adm", 1280, 1200);
  await foto("v03-celular", 390, 844);
}

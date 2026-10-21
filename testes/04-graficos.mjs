/* =========================================================
   04 — Gráficos do painel (v0.4)

   Cobertura por hora e dia, horas por semana por pessoa, linha do tempo com raias e a
   dica no foco do teclado.

   Roda com: node testes/rodar.mjs 04
   ========================================================= */
export const nome = "Gráficos do painel (v0.4)";
export const opcoes = { downloads: true, foco: true };

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

  await clica("#navPainel"); await dorme(800);
  const segunda = (n) => n; // só para leitura

  console.log("1. Cobertura (hoje, todas as unidades)");
  const cab = await ev(`[...document.querySelectorAll("#gCobertura thead th")].slice(1).map(t => t.textContent)`);
  confere(JSON.stringify(cab) === '["Seg","Ter","Qua","Qui","Sex"]', "colunas de segunda a sexta (fim de semana não usado hoje)");
  const horas = await ev(`[...document.querySelectorAll("#gCobertura tbody td.h")].map(t => t.textContent)`);
  confere(horas[0] === "09h" && horas.at(-1) === "18h", "horas da primeira à última usada: " + horas[0] + "–" + horas.at(-1));
  const col = await ev(`[...document.querySelectorAll("#gCobertura tbody tr")].map(tr => tr.cells[1].textContent)`);
  confere(JSON.stringify(col) === '["2","2","2","2","3","3","2","2","1","1"]', "segunda, hora a hora (pessoas distintas): " + JSON.stringify(col));
  confere(await ev(`document.querySelector("#gCobertura tbody tr:nth-child(5) td.c").className`) === "c n3", "3 pessoas = 3º degrau");
  confere((await ev(`document.querySelector("#gCobertura tbody tr:nth-child(5) td.c").dataset.dica`)).includes("Ana Beatriz Nunes, Carlos Eduardo Prado, Roberto Aguiar"), "dica lista quem cobre");
  confere((await ev(`document.getElementById("legCobertura").textContent`)).includes("0 — descoberta"), "legenda com o zero");

  console.log("2. Hora descoberta");
  await valor("selUnidadeVer", "SEACE"); await ev(`document.getElementById("selUnidadeVer").dispatchEvent(new Event("change"))`); await dorme(100);
  const zeros = await ev(`[...document.querySelectorAll("#gCobertura td.c.n0")].map(t => t.textContent)`);
  confere(zeros.length === 0, "SEACE hoje só tem a Ana: grade só nas horas dela, sem zeros");
  await valor("selUnidadeVer", "*"); await ev(`document.getElementById("selUnidadeVer").dispatchEvent(new Event("change"))`); await dorme(100);

  console.log("3. Horas por semana");
  const barras = () => ev(`[...document.querySelectorAll("#gHoras .barras .nome")].map(n => n.textContent)`);
  confere(JSON.stringify(await barras()) === '["Ana Beatriz Nunes","Carlos Eduardo Prado","Roberto Aguiar"]', "ordem alfabética por padrão");
  const dourado = await ev(`[...document.querySelectorAll("#gHoras .trilho")].map(t => t.querySelector(".b").classList.contains("diverge"))`);
  confere(JSON.stringify(dourado) === "[false,false,false]" && await ev(`document.querySelectorAll("#gHoras .ref").length`) === 0,
    "barras de uma cor só, sem traço de jornada");
  confere(JSON.stringify(await ev(`[...document.querySelectorAll("#gHoras .v")].map(v => v.textContent)`)) === '["30h","30h","40h"]', "valor na ponta de cada barra");
  await clica("#btnOrdem"); await dorme(100);
  confere((await barras())[0] === "Roberto Aguiar" && await ev(txt("btnOrdem")) === "ordenar por nome", "ordenar por volume, e volta");
  await clica("#btnOrdem");

  console.log("4. Linha do tempo");
  const nomesLT = await ev(`[...document.querySelectorAll("#gLinha .lt-linha .nome")].map(n => n.textContent)`);
  confere(JSON.stringify(nomesLT) === '["Ana Beatriz Nunes","Carlos Eduardo Prado","Roberto Aguiar"]', "uma faixa por pessoa");
  const ana = await ev(`[...document.querySelectorAll("#gLinha .lt-linha")][1].querySelectorAll(".lt-bloco").length`);
  confere(ana === 2, "Ana: vigente e futura");
  confere(await ev(`[...document.querySelectorAll("#gLinha .lt-linha")][1].querySelector(".lt-faixa").style.height`) === "32px", "sobreposição vai para uma segunda raia");
  confere(await ev(`[...document.querySelectorAll("#gLinha .lt-linha")][1].querySelector(".lt-bloco").className.includes("vigente")`) &&
    await ev(`[...document.querySelectorAll("#gLinha .lt-linha")][1].querySelector(".lt-bloco").className.includes("segue")`), "vigente em verde, sem fim = continua além da janela");
  confere(await ev(`document.querySelectorAll("#gLinha .lt-ref").length`) === 3, "linha da data de referência em cada faixa");
  confere(await ev(`!!document.querySelector("#gLinha .lt-faixa[aria-label^='Ana Beatriz Nunes: ']")`), "faixa tem texto alternativo");

  console.log("5. Dica no foco e no ponteiro");
  await ev(`document.querySelector("#gHoras .trilho").focus()`); await dorme(100);
  confere(!(await ev(`document.getElementById("dicaGrafico").hidden`)) && (await ev(txt("dicaGrafico"))).includes("30h por semana"), "foco pelo teclado mostra a dica");
  await ev(`document.querySelector("#gHoras .trilho").blur()`);

  console.log("6. Num mês");
  await valor("selModo", "mes"); await ev(`document.getElementById("selModo").dispatchEvent(new Event("change"))`);
  await valor("inpRefMes", MES_QUE_VEM); await ev(`document.getElementById("inpRefMes").dispatchEvent(new Event("change"))`); await dorme(100);
  confere((await ev(`document.getElementById("gHoras").textContent`)).includes("se somariam") && await ev(`document.getElementById("btnOrdem").hidden`), "barras recusam o mês, com o motivo");
  const cabMes = await ev(`[...document.querySelectorAll("#gCobertura thead th")].slice(1).map(t => t.textContent)`);
  confere(cabMes.includes("Sáb"), "no mês, o sábado da futura da Ana aparece na cobertura");
  confere((await ev(txt("subLinha"))).startsWith("De " + MES_QUE_VEM.split("-").reverse().join("/").replace(/^/, "01/")), "janela da linha do tempo é o mês");
  await valor("selModo", "data"); await ev(`document.getElementById("selModo").dispatchEvent(new Event("change"))`); await dorme(100);
  await foto("v04-painel", 1280, 1700);
  await foto("v04-celular", 390, 844);
}

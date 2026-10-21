/* =========================================================
   05 — Sem jornada, ausências (v0.5)

   Sem pergunta de jornada, sem crédito no Sobre, registro de ausências e o efeito
   delas no painel (cobertura na data, indicador, tabela, CSV, linha do tempo).

   Roda com: node testes/rodar.mjs 05
   ========================================================= */
export const nome = "Sem jornada, ausências (v0.5)";
export const opcoes = { downloads: true, foco: true };

export default async function (t) {
  const { ev, cmd, dorme, confere, vis, txt, aviso, clica, valor, abrir, foto } = t;
  const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
  const HOJE = iso(0);
  const fmt = (s) => s.split("-").reverse().join("/");
  const grava = (c, t) => ev(`__gravar(${JSON.stringify(c)}, ${JSON.stringify(t)})`);
  const lerRob = async () => JSON.parse(await ev(`__ler("declaracoes/roberto-aguiar.json")`));
  const kpis = () => ev(`[...document.querySelectorAll("#kpis .kpi .valor")].map(v => v.textContent.trim())`);
  async function registrar({ tipo = "ferias", de = "", ate = "", obs = "" }) {
    await valor("selAusTipo", tipo); await valor("inpAusDe", de); await valor("inpAusAte", ate); await valor("inpAusObs", obs);
    await clica("#btnAus"); await dorme(500);
    return ev(aviso("avisoAus"));
  }


  console.log("1. Sem jornada e sem crédito de origem");
  confere(await ev(txt("versaoApp")) === await ev("APP.rotulo"), "versão do versao.js no rail");
  confere(!(await ev(`document.getElementById("dlgSobre").textContent`)).includes("Derivado"), "Sobre sem 'Derivado do Programa de Resultados'");
  await clica("#btnPasta"); await dorme(500);
  confere(!(await ev(`!!document.getElementById("chipsCarga")`)) &&
    !(await ev(`document.getElementById("cardIdent").textContent`)).toLowerCase().includes("jornada"), "oficializar não pede jornada");
  await valor("inpOfNome", "Roberto Aguiar"); await valor("inpOfUnidade", "SEORE");
  await valor("inpOfSenha", "1234"); await valor("inpOfSenha2", "1234");
  await clica("#btnIniciar"); await dorme(900);
  confere(await ev(vis("vHor")), "entra direto em Meus horários");
  confere(!(await ev(txt("txtIdentResumo"))).includes("h/dia") && !(await ev(txt("fichaEu"))).includes("Jornada"), "rail e ficha sem jornada");

  console.log("2. Registrar ausência: recusas");
  confere(JSON.stringify(await ev(`[...document.getElementById("selAusTipo").options].map(o => o.textContent)`)) ===
    '["Férias","Licença","Recesso","Outro afastamento"]', "quatro tipos, do catálogo");
  let m = await registrar({ de: iso(10) });
  confere(m.includes("último dia"), "ausência exige último dia");
  m = await registrar({ de: iso(10), ate: iso(5) });
  confere(m.includes("anterior ao primeiro"), "último dia antes do primeiro");

  console.log("3. Futura: registrar, colisão, excluir");
  m = await registrar({ tipo: "recesso", de: iso(30), ate: iso(40), obs: "recesso de fim de ano" });
  confere(m.includes("registrada"), "ausência futura registrada");
  let arq = await lerRob();
  const aus1 = arq.ausencias?.[0];
  confere(aus1 && aus1.tipo === "recesso" && aus1.de === iso(30) && aus1.ate === iso(40) && aus1.unidade === "SEORE" &&
    /^aus-\d+-/.test(aus1.id) && aus1.criadaEm && Array.isArray(arq.declaracoes), "gravada na chave ausencias, com unidade carimbada");
  m = await registrar({ tipo: "licenca", de: iso(35), ate: iso(45) });
  confere(m.includes("Cruza com a ausência de Recesso"), "duas ausências não cobrem o mesmo dia");
  confere(await ev(`!!document.querySelector('#listaAus [data-aus-excluir]')`), "futura oferece excluir");
  await clica('#listaAus [data-aus-excluir]'); await dorme(500);
  confere(((await lerRob()).ausencias || []).length === 0, "futura excluída");

  console.log("4. Em curso: aviso, encerrar");
  await ev(`document.getElementById("inpDe").value = "${iso(-20)}"; marcarDias([0,1,2,3,4,5,6]);
    document.getElementById("inpInicio").value = "09:00"; document.getElementById("inpFim").value = "17:00"`);
  await clica("#btnDeclarar"); await dorme(500);
  m = await registrar({ tipo: "ferias", de: iso(-2), ate: iso(8) });
  confere(m.includes("registrada"), "férias em curso registradas, por cima de uma declaração vigente");
  confere((await ev(txt("avisoHoje"))).includes("Hoje você está em Férias"), "Minha semana avisa a ausência de hoje");
  confere(await ev(`!document.querySelector('#listaAus [data-aus-excluir]')`) &&
    await ev(`!!document.querySelector('#listaAus [data-aus-encerrar]')`), "em curso: encerrar, não excluir");
  await clica('#listaAus [data-aus-encerrar]'); await dorme(200);
  await valor("inpEncerrarAte", iso(-1)); await clica('#formEncerrar button[type="submit"]'); await dorme(200);
  confere((await ev(aviso("avisoEncerrar"))).includes("a partir de"), "encerrar no passado é recusado");
  await valor("inpEncerrarAte", iso(3)); await clica('#formEncerrar button[type="submit"]'); await dorme(500);
  confere((await lerRob()).ausencias[0].ate === iso(3), "férias encerradas antes");
  confere((await lerRob()).declaracoes.length === 1, "a declaração não foi tocada");

  console.log("5. Painel");
  const cfg = JSON.parse(await ev(`__ler("config.json")`));
  cfg.pessoas["Ana Beatriz Nunes"] = { unidade: "SEORE" };
  await grava("config.json", JSON.stringify(cfg));
  await grava("declaracoes/ana-beatriz-nunes.json", JSON.stringify({ formato: 1, pessoa: "Ana Beatriz Nunes", unidade: "SEORE",
    declaracoes: [{ id: "dec-a", unidade: "SEORE", de: iso(-30), ate: null, dias: [1, 2, 3, 4, 5], inicio: "10:00", fim: "12:00" }],
    ausencias: [{ id: "aus-a", unidade: "SEORE", tipo: "licenca", de: iso(50), ate: iso(60) }, { quebrada: true }] }));
  await clica("#btnAtualizar"); await dorme(600);
  await clica("#navPainel"); await dorme(800);
  const k = await kpis();
  confere(k[4] === "1", "indicador Ausentes = 1 (Roberto hoje): " + JSON.stringify(k));
  const seg10 = await ev(`[...document.querySelectorAll("#gCobertura tbody tr")].find(tr => tr.cells[0].textContent === "10h").cells[1].textContent`);
  confere(seg10 === "1", "cobertura tira o Roberto ausente: segunda 10h conta só a Ana");
  confere((await ev(txt("notaCobertura"))).includes("Fora da conta por ausência na data: Roberto Aguiar"), "nota diz quem saiu da conta");
  const seg9 = await ev(`[...document.querySelectorAll("#gCobertura tbody tr")].find(tr => tr.cells[0].textContent === "09h").cells[1].className`);
  confere(seg9 === "c n0" && (await ev(`[...document.querySelectorAll("#gCobertura thead th")].map(t => t.textContent).join()`)).includes("Dom"),
    "horas e dias que só o ausente cobria aparecem como zero (descoberta), em vez de sumir");
  confere((await ev(`document.getElementById("tbodyPainel").textContent`)).includes("ausente: férias"), "tabela marca a declaração de quem está ausente");
  confere((await ev(`document.getElementById("tbodyAusPainel").textContent`)).includes("Férias") &&
    await ev(`document.querySelectorAll("#tbodyAusPainel tr").length`) === 1, "tabela de ausências: só a da data");
  confere(await ev(`document.querySelectorAll("#gLinha .lt-aus").length`) === 2, "linha do tempo mostra as duas ausências válidas (a malformada fica fora)");
  confere((await ev(`[...document.querySelectorAll("#gHoras .trilho")].map(t => t.dataset.dica).join("|")`)).includes("ausente na data"), "barra do ausente avisa na dica");
  await clica("#btnCSVAus"); await dorme(200);
  const csv = await ev(`window.__blobs.at(-1).text()`);
  const bytes = await ev(`window.__blobs.at(-1).arrayBuffer().then(b => [...new Uint8Array(b).slice(0, 3)])`);
  confere(JSON.stringify(bytes) === "[239,187,191]" && csv.includes('"Tipo";"Primeiro dia";"Último dia";"Dias corridos"') &&
    csv.includes(`"Férias";"${fmt(iso(-2))}";"${fmt(iso(3))}";"6"`), "CSV de ausências com BOM, tipo por extenso e dias corridos");
  await valor("selModo", "mes"); await ev(`document.getElementById("selModo").dispatchEvent(new Event("change"))`); await dorme(100);
  confere((await ev(txt("notaCobertura"))).includes("ausências não são descontadas"), "no mês, a cobertura não desconta e diz por quê");
  await valor("selModo", "data"); await ev(`document.getElementById("selModo").dispatchEvent(new Event("change"))`); await dorme(100);
  await foto("v05-painel", 1280, 1500);
  await clica("#navHor"); await dorme(600);
  await foto("v05-hor", 1280, 1500);
}

/* =========================================================
   02 — Meus horários: declarar (v0.2)

   As recusas do formulário, o total ao vivo, a colisão (período + dia + hora, conferida
   contra o arquivo relido), substituir, encerrar, excluir (inclusive o engano do dia,
   v0.8) e a grade da semana.

   Roda com: node testes/rodar.mjs 02
   ========================================================= */
export const nome = "Meus horários: declarar (v0.2)";
export const opcoes = {};

export default async function (t) {
  const { ev, cmd, dorme, confere, vis, txt, aviso, clica, valor, abrir, foto } = t;
  const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
  const HOJE = iso(0);
  // Sem declaração nenhuma o arquivo ainda não existe: entrar não grava nada desde a v0.5.
  const lerArq = async () => JSON.parse(await ev(`__ler("declaracoes/roberto-aguiar.json").catch(() => '{"declaracoes":[]}')`)).declaracoes;
  async function preencher({ de, ate = "", dias = [1, 2, 3, 4, 5], inicio, fim, obs = "" }) {
    await valor("inpDe", de); await valor("inpAte", ate);
    await valor("inpInicio", inicio); await valor("inpFim", fim); await valor("inpObs", obs);
    await ev(`marcarDias(${JSON.stringify(dias)})`);
    await ev(`["inpDe","inpInicio","inpFim"].forEach(id => document.getElementById(id).dispatchEvent(new Event("input")))`);
  }
  async function declarar(campos) {
    await preencher(campos);
    await clica("#btnDeclarar"); await dorme(500);
    return ev(aviso("avisoDecl"));
  }
  // Próxima data (a partir de n dias) que cai no dia da semana pedido.
  const proximo = (diaSemana, n = 1) => {
    for (let i = n; i < n + 7; i++) if (new Date(iso(i) + "T00:00:00Z").getUTCDay() === diaSemana) return iso(i);
  };


  console.log("0. Preparação: pasta nova");
  confere(await ev(txt("versaoApp")) === await ev("APP.rotulo"), "versão do versao.js no rail");
  await clica("#btnPasta"); await dorme(500);
  await valor("inpOfNome", "Roberto Aguiar"); await valor("inpOfUnidade", "SEORE");
  await valor("inpOfSenha", "1234"); await valor("inpOfSenha2", "1234");
  await clica("#btnIniciar"); await dorme(900);
  confere(await ev(vis("vHor")), "entra em Meus horários");
  confere((await ev(`document.getElementById("listaMinhas").textContent`)).includes("Nenhuma declaração valendo"), "lista começa vazia");

  console.log("1. Recusas do formulário (7.2)");
  let m = await declarar({ de: HOJE, inicio: "15:00", fim: "09:00" });
  confere(m.includes("meia-noite"), "faixa invertida explica a meia-noite");
  m = await declarar({ de: HOJE, dias: [], inicio: "09:00", fim: "15:00" });
  confere(m.includes("pelo menos um dia"), "sem dia da semana");
  m = await declarar({ de: iso(5), ate: iso(2), inicio: "09:00", fim: "15:00" });
  confere(m.includes("anterior ao primeiro"), "último dia antes do primeiro");
  const domingo = proximo(0);
  m = await declarar({ de: domingo, ate: domingo, dias: [1], inicio: "09:00", fim: "15:00" });
  confere(m.includes("Nenhum dos dias marcados"), "dia marcado fora do período");
  confere((await lerArq()).length === 0, "nenhuma recusa gravou nada");

  console.log("2. Declarar e total ao vivo");
  await preencher({ de: iso(-30), inicio: "09:00", fim: "15:00" });
  const vivo = await ev(txt("totalVivo"));
  confere(vivo.includes("6h por dia") && vivo.includes("30h por semana"), "total ao vivo: " + vivo.slice(0, 40));
  confere(!vivo.includes("jornada"), "total ao vivo sem comparação com jornada");
  confere(vivo.includes("Começa no passado"), "aviso de início no passado");
  m = await declarar({ de: iso(-30), inicio: "09:00", fim: "15:00", obs: "atendimento <b>presencial</b>" });
  confere(m.includes("gravada"), "declaração gravada");
  let arq = await lerArq();
  const A = arq[0];
  confere(arq.length === 1 && !("carga" in A) && A.unidade === "SEORE" && A.ate === null &&
    JSON.stringify(A.dias) === "[1,2,3,4,5]" && /^dec-\d+-/.test(A.id) && A.criadaEm, "esquema 5.1 com retratos de carga e unidade");
  confere(await ev(`!!document.querySelector("#listaMinhas .decl.vigente .tag.vigente")`) &&
    await ev(`!document.querySelector(".tag.diverge, .divergente")`), "vigente marcada; nenhum aviso dourado");
  confere(await ev(`document.querySelector("#listaMinhas .obs").innerHTML.includes("&lt;b&gt;")`), "observação escapada");
  confere(await ev(`!!document.querySelector('#listaMinhas [data-excluir="${A.id}"]')`), "vigente declarada hoje oferece excluir (engano do dia)");

  console.log("3. Colisão só quando período, dia e hora se cruzam");
  m = await declarar({ de: HOJE, dias: [2, 4], inicio: "14:00", fim: "16:00" });
  confere(m.includes("Colide") && m.includes("Ter Qui"), "colisão cita a outra declaração e os dias");
  m = await declarar({ de: iso(-30), dias: [1, 2, 3, 4, 5], inicio: "15:00", fim: "17:00" });
  confere(m.includes("gravada"), "faixa encostada (15h) não colide — jornada partida");
  m = await declarar({ de: iso(-30), dias: [6], inicio: "09:00", fim: "12:00" });
  confere(m.includes("gravada"), "mesma hora em outro dia não colide");
  confere((await lerArq()).length === 3, "três declarações no arquivo");

  console.log("4. Grade da semana");
  const totais = await ev(`[...document.querySelectorAll("#gradeSemana tfoot td")].map(t => t.textContent + (t.classList.contains("divergente") ? "*" : ""))`);
  confere(JSON.stringify(totais) === JSON.stringify(["Total", "8h", "8h", "8h", "8h", "8h", "3h"]), "totais do dia: " + JSON.stringify(totais));
  confere(await ev(`document.querySelectorAll("#gradeSemana td.coberta").length`) === 5 * 8 + 3, "células cobertas (hora inteira)");

  console.log("5. Futura: excluir");
  m = await declarar({ de: iso(10), ate: iso(40), dias: [0], inicio: "08:00", fim: "12:00" });
  confere(m.includes("gravada") && await ev(`!!document.querySelector('#listaMinhas .futura [data-excluir]')`), "futura oferece excluir");
  await clica('#listaMinhas .futura [data-excluir]'); await dorme(500);
  confere((await lerArq()).length === 3, "futura excluída");

  console.log("5b. Engano do dia: excluir no dia em que foi declarada (v0.8)");
  // O caso da prova de uso: começa e termina hoje. Sem a exceção, nenhuma ação servia.
  const diaHoje = new Date(HOJE + "T00:00:00Z").getUTCDay();
  m = await declarar({ de: HOJE, ate: HOJE, dias: [diaHoje], inicio: "20:00", fim: "21:00" });
  let D = (await lerArq()).find(d => d.inicio === "20:00");
  confere(m.includes("gravada") && D, "declaração só de hoje gravada");
  confere(await ev(`!document.querySelector('[data-subst="${D.id}"], [data-encerrar="${D.id}"]')`) &&
    await ev(`!!document.querySelector('[data-excluir="${D.id}"]')`), "só de hoje: sem substituir nem encerrar, com excluir");
  m = await declarar({ de: HOJE, ate: HOJE, dias: [diaHoje], inicio: "20:00", fim: "22:00" });
  confere(m.includes("Colide"), "enquanto existir, a nova colide com ela");
  await clica(`[data-excluir="${D.id}"]`); await dorme(500);
  confere(!(await lerArq()).some(d => d.id === D.id), "declarada hoje e já começada: excluída");
  m = await declarar({ de: HOJE, ate: HOJE, dias: [diaHoje], inicio: "20:00", fim: "22:00" });
  D = (await lerArq()).find(d => d.inicio === "20:00");
  confere(m.includes("gravada") && D.fim === "22:00", "horário de hoje declarado de novo");

  // A exceção se confere contra o arquivo relido: a tela ainda oferece, o arquivo diz "ontem".
  const ontem = new Date(iso(-1) + "T12:00:00").toISOString();
  let dado5 = JSON.parse(await ev(`__ler("declaracoes/roberto-aguiar.json")`));
  dado5.declaracoes.find(d => d.id === D.id).criadaEm = ontem;
  await ev(`__gravar("declaracoes/roberto-aguiar.json", ${JSON.stringify(JSON.stringify(dado5))})`);
  await clica(`[data-excluir="${D.id}"]`); await dorme(500);
  confere((await ev(aviso("avisoDecl"))).includes("não foi declarada hoje") &&
    (await lerArq()).some(d => d.id === D.id), "declarada ontem segundo o arquivo: recusa e nada se apaga");

  // Declarada noutro dia, ou em arquivo antigo sem criadaEm: continua sem excluir.
  dado5.declaracoes.push({ ...D, id: "dec-1-semdata", de: iso(-5), ate: null, inicio: "22:00", fim: "23:00", criadaEm: undefined });
  await ev(`__gravar("declaracoes/roberto-aguiar.json", ${JSON.stringify(JSON.stringify(dado5))})`);
  await clica("#btnAtualizar"); await dorme(700);
  confere(await ev(`!document.querySelector('[data-excluir="${D.id}"], [data-excluir="dec-1-semdata"]')`),
    "declarada ontem ou sem criadaEm: sem excluir");
  dado5.declaracoes = dado5.declaracoes.filter(d => d.id !== D.id && d.id !== "dec-1-semdata");
  await ev(`__gravar("declaracoes/roberto-aguiar.json", ${JSON.stringify(JSON.stringify(dado5))})`);
  await clica("#btnAtualizar"); await dorme(700);
  confere((await lerArq()).length === 3, "arquivo de volta às três declarações");

  console.log("6. Substituir");
  await clica(`#listaMinhas [data-subst="${A.id}"]`); await dorme(200);
  confere(await ev(vis("faixaSubst")) && (await ev(`document.getElementById("inpDe").value`)) === HOJE, "substituir começa hoje, com o horário atual");
  await valor("inpDe", iso(-1));
  await valor("inpInicio", "08:00"); await valor("inpFim", "14:00");
  await clica("#btnDeclarar"); await dorme(500);
  confere((await ev(aviso("avisoDecl"))).includes("a partir de"), "substituição não começa no passado");
  await valor("inpDe", iso(1)); await clica("#btnDeclarar"); await dorme(500);
  confere((await ev(aviso("avisoDecl"))).includes("substituída"), "substituição gravada");
  arq = await lerArq();
  const velha = arq.find(d => d.id === A.id), nova = arq.find(d => d.inicio === "08:00");
  confere(velha.ate === HOJE && nova.de === iso(1) && nova.ate === null, "atual termina na véspera, nova começa amanhã");
  confere(arq.length === 4, "substituir não apaga a antiga");

  console.log("7. Encerrar");
  const C = arq.find(d => d.inicio === "15:00");
  await clica(`#listaMinhas [data-encerrar="${C.id}"]`); await dorme(200);
  await valor("inpEncerrarAte", iso(-2)); await clica('#formEncerrar button[type="submit"]'); await dorme(200);
  confere((await ev(aviso("avisoEncerrar"))).includes("a partir de"), "encerrar no passado é recusado");
  await valor("inpEncerrarAte", iso(5)); await clica('#formEncerrar button[type="submit"]'); await dorme(500);
  confere((await lerArq()).find(d => d.id === C.id).ate === iso(5), "encerrada com o último dia escolhido");

  console.log("8. Colisão conferida contra o arquivo, não contra a tela");
  arq = await lerArq();
  const intrusa = { ...arq[0], id: "dec-1-outraaba", de: iso(20), ate: iso(30), dias: [3], inicio: "18:00", fim: "20:00" };
  const dado = JSON.parse(await ev(`__ler("declaracoes/roberto-aguiar.json")`));
  dado.declaracoes.push(intrusa);
  await ev(`__gravar("declaracoes/roberto-aguiar.json", ${JSON.stringify(JSON.stringify(dado))})`);
  m = await declarar({ de: iso(20), ate: iso(30), dias: [0,1,2,3,4,5,6], inicio: "19:00", fim: "21:00" });
  confere(m.includes("Colide"), "declaração de outra aba é levada em conta");
  // Mesmo dia da semana, mas os períodos só se cruzam em dias que não são quarta.
  const seg = proximo(1, 35);
  intrusa.de = iso(35); intrusa.ate = seg; // termina numa segunda
  dado.declaracoes[dado.declaracoes.length - 1] = intrusa;
  await ev(`__gravar("declaracoes/roberto-aguiar.json", ${JSON.stringify(JSON.stringify(dado))})`);
  await clica("#btnAtualizar"); await dorme(700);
  m = await declarar({ de: seg, ate: seg, dias: [1, 3], inicio: "19:00", fim: "21:00" });
  confere(m.includes("gravada"), "dia em comum que não ocorre na sobreposição não colide");

  console.log("9. Arquivo ilegível bloqueia o formulário");
  await ev(`__gravar("declaracoes/roberto-aguiar.json", "{ x")`);
  await clica("#btnAtualizar"); await dorme(800);
  confere((await ev(`document.getElementById("listaMinhas").textContent`)).includes("ilegível") &&
    await ev(`document.getElementById("btnDeclarar").disabled`), "mostra o motivo e desliga Declarar");
  await ev(`__gravar("declaracoes/roberto-aguiar.json", ${JSON.stringify(JSON.stringify(dado))})`);
  await clica("#btnAtualizar"); await dorme(800);
  confere(!(await ev(`document.getElementById("btnDeclarar").disabled`)), "volta ao normal depois de corrigido");
  await foto("v02-hor", 1280, 1100);
  await foto("v02-celular", 390, 844);
}

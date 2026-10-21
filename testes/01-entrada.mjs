/* =========================================================
   01 — Entrada, cadastro e papéis (v0.1)

   Oficializar a pasta, entrar, cadastrar unidades, pessoas e papéis, as recusas da
   Administração, a conferência de atualizadoEm entre dois administradores, arquivos
   ilegíveis e chaves desconhecidas, Ajuda, Sobre e o cache do service worker.

   Roda com: node testes/rodar.mjs 01
   ========================================================= */
export const nome = "Entrada, cadastro e papéis (v0.1)";
export const opcoes = {};

export default async function (t) {
  const { ev, cmd, dorme, confere, vis, txt, aviso, clica, valor, abrir, foto } = t;

  console.log("1. Pasta virgem: oficializar");
  confere(await ev(txt("versaoApp")) === await ev("APP.rotulo") && (await ev("APP.rotulo")).startsWith("versão "), "etiqueta da versão vem do versao.js");
  confere(await ev(vis("vEntrada")), "abre na entrada");
  await clica("#btnPasta"); await dorme(500);
  confere(await ev(vis("blocoOficializar")), "pasta sem config.json oferece oficializar");
  await valor("inpOfNome", "Roberto Aguiar"); await valor("inpOfUnidade", "SEORE");
  await valor("inpOfSenha", "1234"); await valor("inpOfSenha2", "9999");
  
  await clica("#btnIniciar"); await dorme(300);
  confere((await ev(aviso("avisoIdent"))).includes("não conferem"), "senhas diferentes são recusadas");
  await valor("inpOfSenha2", "1234");
  await clica("#btnIniciar"); await dorme(800);
  const cfg1 = JSON.parse(await ev(`__ler("config.json")`));
  confere(cfg1.pessoas["Roberto Aguiar"]?.adm === true && cfg1.unidades[0] === "SEORE", "config.json criado com o primeiro adm");
  confere(cfg1.formato === 1 && typeof cfg1.atualizadoEm === "string" && cfg1.instalacao?.id, "config.json tem formato, atualizadoEm e selo");
  confere(!("administrador" in cfg1), "não há chave 'administrador' fixa");
  confere(!(await ev(`__ler("declaracoes/roberto-aguiar.json").then(() => true, () => false)`)), "entrar não grava arquivo (a jornada não é mais pedida)");
  confere(!(await ev(`!!document.getElementById("chipsCarga")`)), "não há escolha de 8 ou 6 horas na tela");
  confere(await ev(vis("vHor")), "entra em Meus horários");
  confere(await ev(vis("navAdm")), "adm vê Administração no rail");

  console.log("2. Administração: unidades, pessoas, papéis");
  await clica("#navAdm"); await dorme(200);
  await valor("inpNovaUnidade", "SEACE"); await clica("#btnNovaUnidade"); await dorme(400);
  await valor("inpNovaUnidade", "seace"); await clica("#btnNovaUnidade"); await dorme(400);
  confere((await ev(aviso("avisoUnidades"))).includes("já está cadastrada"), "unidade repetida (sem diferenciar maiúsculas) é recusada");
  await valor("inpNovaPessoa", "Ana Beatriz Nunes"); await valor("selNovaPessoaUnidade", "SEACE");
  await clica("#btnNovaPessoa"); await dorme(400);
  await valor("inpNovaPessoa", "Ana Beatriz Núnes"); await clica("#btnNovaPessoa"); await dorme(400);
  confere((await ev(aviso("avisoAdm"))).includes("mesmo arquivo"), "nome com o mesmo slug é recusado");
  await valor("inpNovaPessoa", "Helena Barros"); await valor("selNovaPessoaUnidade", "SEORE");
  await clica("#btnNovaPessoa"); await dorme(400);

  // Helena vira leitora de SEORE e SEACE
  const iHelena = await ev(`pessoasAdm.indexOf("Helena Barros")`);
  await clica(`[data-acao="leitor"][data-i="${iHelena}"]`); await dorme(200);
  await clica("#btnLeitorSalvar"); await dorme(200);
  confere((await ev(aviso("avisoLeitor"))).includes("pelo menos uma"), "leitor sem unidade é recusado");
  await ev(`document.querySelectorAll("#leitorUnidades input").forEach(c => c.checked = true)`);
  await clica("#btnLeitorSalvar"); await dorme(500);
  let cfg = JSON.parse(await ev(`__ler("config.json")`));
  confere(JSON.stringify(cfg.pessoas["Helena Barros"].leitor) === JSON.stringify(["SEORE", "SEACE"]), "leitor gravado com a lista de unidades");

  // Remover unidade em uso
  await ev(`window.confirm = () => true`);
  await clica(`[data-rmunidade="1"]`); await dorme(400);
  confere((await ev(aviso("avisoUnidades"))).includes("ainda tem"), "unidade com pessoas não pode ser removida");

  // Último adm
  const iRob = await ev(`pessoasAdm.indexOf("Roberto Aguiar")`);
  await clica(`[data-acao="adm"][data-i="${iRob}"]`); await dorme(300);
  confere((await ev(aviso("avisoAdm"))).includes("única pessoa"), "não retira o papel do último adm");
  await clica(`[data-acao="remover"][data-i="${iRob}"]`); await dorme(300);
  confere((await ev(aviso("avisoAdm"))).includes("não pode sair"), "não remove o último adm");

  // Ana vira adm: pede senha no mesmo ato
  const iAna = await ev(`pessoasAdm.indexOf("Ana Beatriz Nunes")`);
  await clica(`[data-acao="adm"][data-i="${iAna}"]`); await dorme(300);
  confere(await ev(`document.getElementById("dlgSenha").open`), "tornar adm sem senha abre a janela de senha");
  await valor("inpSenha1", "abcd"); await valor("inpSenha2", "abcd");
  await clica('#formSenha button[type="submit"]'); await dorme(600);
  cfg = JSON.parse(await ev(`__ler("config.json")`));
  confere(cfg.pessoas["Ana Beatriz Nunes"].adm === true && cfg.senhas["Ana Beatriz Nunes"]?.length === 64, "adm e senha gravados juntos");
  confere(!(await ev(`!!document.querySelector('[data-acao="rmsenha"][data-i="${iAna}"]')`)), "adm não oferece 'Remover senha'");

  await foto("adm");
  console.log("3. Dois administradores: conferência de atualizadoEm");
  const outro = { ...cfg, unidades: [...cfg.unidades, "SEDIN"], atualizadoEm: new Date(Date.now() + 1000).toISOString() };
  await ev(`__gravar("config.json", ${JSON.stringify(JSON.stringify(outro))})`);
  await valor("inpNovaUnidade", "SENOV"); await clica("#btnNovaUnidade"); await dorme(500);
  confere((await ev(aviso("avisoUnidades"))).includes("Outro administrador"), "gravação recusada quando outro adm gravou antes");
  cfg = JSON.parse(await ev(`__ler("config.json")`));
  confere(cfg.unidades.includes("SEDIN") && !cfg.unidades.includes("SENOV"), "a mudança do outro adm não foi apagada");
  await clica("#btnAtualizar"); await dorme(600);
  await valor("inpNovaUnidade", "SENOV"); await clica("#btnNovaUnidade"); await dorme(500);
  cfg = JSON.parse(await ev(`__ler("config.json")`));
  confere(cfg.unidades.includes("SEDIN") && cfg.unidades.includes("SENOV"), "depois de atualizar, grava sem perder nada");

  console.log("4. Entrar como pessoa comum e como leitora");
  await ev(`window.confirm = () => true`);
  await clica("#btnTrocar"); await dorme(400);
  await valor("selPessoa", "Helena Barros"); await ev(`aoTrocarPessoa()`); await dorme(300);
  confere(!(await ev(vis("cSenha"))), "pessoa sem senha não vê o campo de senha");
  await clica("#btnIniciar"); await dorme(700);
  confere(await ev(vis("vHor")) && !(await ev(vis("navAdm"))), "leitora entra sem Administração");
  confere((await ev(txt("txtIdentResumo"))).includes("leitor"), "rail mostra o papel de leitor");
  confere(await ev(`JSON.stringify(unidadesVisiveis())`) === '["SEORE","SEACE"]', "unidadesVisiveis() do leitor");
  await ev(`irPara("adm")`);
  confere(!(await ev(vis("vAdm"))), "podeVer barra Administração para quem não é adm");

  console.log("5. Chaves desconhecidas sobrevivem à gravação");
  const helena = { formato: 1, pessoa: "Helena Barros", unidade: "SEORE", cargaHoraria: 6, declaracoes: [], realizados: [{ teste: 1 }] };
  await ev(`__gravar("declaracoes/helena-barros.json", ${JSON.stringify(JSON.stringify(helena))})`);
  await clica("#btnAtualizar"); await dorme(700);
  await ev(`document.getElementById("inpDe").value = new Date().toLocaleDateString("sv"); marcarDias([1]);
    document.getElementById("inpInicio").value = "09:00"; document.getElementById("inpFim").value = "10:00"`);
  await clica("#btnDeclarar"); await dorme(600);
  const h2 = JSON.parse(await ev(`__ler("declaracoes/helena-barros.json")`));
  confere(h2.declaracoes.length === 1 && h2.realizados?.[0]?.teste === 1 && h2.cargaHoraria === 6,
    "declaração gravada; 'realizados' e a jornada antiga preservados intactos");
  confere(!("carga" in h2.declaracoes[0]), "declaração nova não leva jornada");

  console.log("6. Arquivo da pessoa ilegível");
  await ev(`__gravar("declaracoes/helena-barros.json", "{ quebrado")`);
  await clica("#btnTrocar"); await dorme(400);
  await valor("selPessoa", "Helena Barros"); await ev(`aoTrocarPessoa()`); await dorme(300);
  await clica("#btnIniciar"); await dorme(800);
  confere((await ev(`document.getElementById("listaMinhas").textContent`)).includes("ilegível") &&
    await ev(`document.getElementById("btnDeclarar").disabled`), "arquivo ilegível: tela avisa e não deixa gravar por cima");
  await clica("#btnTrocar"); await dorme(400);
  confere(await ev(`__ler("declaracoes/helena-barros.json")`) === "{ quebrado", "arquivo ilegível ficou intacto");

  console.log("7. Senha exigida e senha errada");
  await valor("selPessoa", "Ana Beatriz Nunes"); await ev(`aoTrocarPessoa()`); await dorme(300);
  confere(await ev(vis("cSenha")), "adm vê o campo de senha");
  await valor("inpSenha", "errada"); 
  await clica("#btnIniciar"); await dorme(400);
  confere((await ev(aviso("avisoIdent"))).includes("Senha incorreta"), "senha errada recusada");

  console.log("8. Identidade lembrada ao reabrir");
  await valor("inpSenha", "abcd"); 
  await clica("#btnIniciar"); await dorme(700);
  await abrir(); await dorme(500);
  confere(await ev(vis("vHor")) && (await ev(txt("idAtual"))) === "Ana Beatriz Nunes", "reabre direto com a identidade lembrada");

  await foto("hor");
  console.log("9. config.json ilegível: ninguém entra");
  await ev(`__gravar("config.json", "")`);
  await abrir(); await dorme(600);
  confere(await ev(vis("vEntrada")), "volta para a entrada");
  confere((await ev(aviso("avisoIdent"))).includes("NÃO é uma pasta nova"), "explica que não é pasta nova");
  confere(!(await ev(vis("blocoOficializar"))) && !(await ev(vis("btnIniciar"))), "não oferece oficializar nem entrar");

  await foto("entrada-celular", 390, 844);
  await cmd("Emulation.clearDeviceMetricsOverride");
  console.log("10. Ajuda e Sobre antes de entrar");
  await clica("#btnAjuda"); await dorme(200);
  confere(await ev(vis("vAjuda")), "ajuda abre sem identidade");
  const lgpd = await ev(`document.querySelector(".aviso-lgpd").textContent.replace(/\\s+/g, " ")`);
  confere(!(await ev(`!!document.querySelector(".pendente")`)) && !lgpd.includes("pendente"), "marcador de texto pendente removido");
  confere(["Propósito:", "Base Legal:", "Acesso aos Dados:", "Tempo de Guarda:", "Seus Direitos:"].every(k => lgpd.includes(k)),
    "aviso LGPD com os cinco itens aprovados");
  /* Os dois itens que descrevem o programa têm de continuar verdadeiros:
     quem lê (leitores e administradores, e leitura na pasta) e o que não
     existe (aprovação, pontuação). Se o programa mudar, o texto muda junto. */
  confere(lgpd.includes("leitores designados para a sua unidade e pelos administradores") &&
    lgpd.includes("têm acesso de leitura") && lgpd.includes("Não há aprovação, pontuação nem medição de desempenho"),
    "itens factuais do aviso batem com o programa");
  await clica("#btnSobre"); await dorme(200);
  confere(await ev(`document.getElementById("dlgSobre").open`) && (await ev(txt("sobreVersao"))) === "Versão " + await ev("APP.versao"), "Sobre mostra a versão");

  console.log("11. Service worker e cache dt-");
  const caches = await ev(`caches.keys()`);
  confere(Array.isArray(caches) && caches.includes("dt-" + await ev("APP.versao")), "cache dt-<versão> criado: " + JSON.stringify(caches));
}

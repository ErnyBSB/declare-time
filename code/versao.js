/* =========================================================
   VERSÃO — o ÚNICO lugar onde a versão do aplicativo é escrita.

   Quem lê este arquivo:
     index.html  -> a etiqueta ao lado do nome, no alto do rail, e a
                    janela "Sobre o programa";
     sw.js       -> a chave do cache offline ("dt-" + versao), via
                    importScripts.

   Ao publicar uma versão nova, são DUAS coisas que precisam concordar:
   este arquivo e a tag do repositório (a versão "0.1" corresponde à tag
   v0.1 e à chave de cache "dt-0.1"). Versão escrita em dois lugares
   diverge: a tela anuncia uma e o cache serve outra.

   Enquanto o aplicativo não for usado com dados reais, a numeração é
   0.x; a v1.0 marca o primeiro uso em produção (project_design.md,
   10.2). A 0.0 é o repositório antes do código e não ganha tag.

   A data de atualização é preenchida à mão, aqui do lado, de propósito:
   buscá-la do GitHub exigiria acesso à internet, e este aplicativo
   existe justamente para funcionar sem ela (ver LEIA-ME).
   ========================================================= */
const APP = {
  versao:      "0.5",                   // acompanha a tag do repositório
  rotulo:      "versão 0.5 (out/26)",   // etiqueta exibida no rail
  atualizado:  "21.10.2026",            // data desta publicação
  repositorio: "https://github.com/ErnyBSB/declare-time"
};

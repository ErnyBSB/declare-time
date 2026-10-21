/* =========================================================
   CATÁLOGO — o que é fixo no aplicativo: rótulos dos dias, tipos
   de ausência e o caminho da pasta exibido como orientação.
   Pessoas, papéis e senhas NÃO moram aqui: moram no config.json
   da pasta da rede (ver project_design.md, 5.3 e 5.4).
   ========================================================= */

/* Data desta edição do catálogo, no formato dd.mm.aaaa. TROQUE-A SEMPRE
   que mexer neste arquivo — é o único jeito de a tela conseguir dizer
   QUAL catálogo está em uso.

   O navegador decide sozinho quando reler o catalogo.js, e um catálogo
   velho é idêntico a um catálogo certo: nada falha, só que os valores
   são os de antes. Esta data não descongela nada; ela só aparece em
   "Sobre o programa", para que a pergunta "o navegador já está com a
   minha edição?" tenha resposta num relance. */
const CATALOGO_ATUALIZADO = "21.10.2026";

/* Rótulos dos dias, na ordem de Date.getUTCDay(): 0 = domingo. O que
   fica gravado na declaração é o número, nunca o rótulo — por isso os
   rótulos podem mudar e os números não. */
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* Tipos de ausência (v0.5). A chave "k" é o que fica gravado no arquivo
   da pessoa: NUNCA troque uma chave já em uso — só o rótulo. Um tipo
   novo entra com chave nova; um tipo que deixar de existir continua
   aqui, para as ausências antigas que o usam ainda terem nome. */
const TIPOS_AUSENCIA = [
  { k: "ferias",  rotulo: "Férias" },
  { k: "licenca", rotulo: "Licença" },
  { k: "recesso", rotulo: "Recesso" },
  { k: "outro",   rotulo: "Outro afastamento" }
];

/* SEMENTE, e não cadastro. Este arquivo vive num repositório PÚBLICO:
   nome de pessoa NÃO entra aqui, e nem o nome das unidades, que é dado
   da organização que usar o programa. Unidades, pessoas e papéis são
   cadastrados por um administrador, no painel de Administração, e ficam
   no config.json da pasta da rede — que nunca é versionado (ver
   .gitignore e "O que nunca vai para o repositório", no LEIA-ME).

   A semente só vale enquanto a pasta ainda não foi oficializada; a
   partir da oficialização, o config.json manda em tudo. */
const UNIDADES = [];

/* =========================================================
   SENHAS (opcional) — hash SHA-256 de (nome + "|" + senha).
   Gere o código com o utilitário gerar-senha.html.
   Pessoas sem senha:
   - entram sem senha se EXIGIR_SENHA = false;
   - são bloqueadas se EXIGIR_SENHA = true.
   Quem tem o papel adm sempre tem senha, com ou sem EXIGIR_SENHA.
   Atenção: isto é uma barreira contra uso casual de identidade
   alheia. O controle de acesso real vem das permissões NTFS da
   pasta da rede (ver LEIA-ME).

   Este mapa fica VAZIO no repositório. Senha nenhuma, nem em hash, é
   versionada: as senhas de verdade são definidas por um administrador,
   no painel, e ficam no config.json da pasta da rede.
   ========================================================= */
const EXIGIR_SENHA = false;
const SENHAS = {
  // "Nome Da Pessoa": "cole-aqui-o-hash-gerado",
};

/* Caminho da pasta de DADOS exibido como orientação na conexão (o
   navegador não permite abrir o caminho automaticamente; cada pessoa o
   seleciona uma vez e a escolha fica memorizada). Na rede, a pasta
   administrativa tem duas subpastas: code\ (este programa) e
   Compartilhamento\ (os dados) — ver project_design.md, 4.2. Este
   caminho é o de Compartilhamento\, nunca o de code\.
   É um EXEMPLO: troque pelo caminho real na cópia publicada em code\. */
const PASTA_REDE = "\\\\SERVIDOR\\PastaAdministrativa\\Compartilhamento";

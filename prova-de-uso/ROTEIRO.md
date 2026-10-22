# Prova de uso — roteiro

Roteiro da fase 5 do `project_design.md` (issue #20): usar a **Declaração de
disponibilidade** com **uma unidade real**, numa **pasta de rede real**, com as
**permissões NTFS aplicadas e conferidas pela TI**, durante uma ou duas semanas, e
corrigir o que aparecer. É o último passo antes da v1.0 (lista em
`project_design.md`, 10.3).

Quem coordena a prova imprime este roteiro e vai marcando. O guia de instalação
completo está em `code/LEIA-ME.txt`, na parte "Para quem vai instalar e manter"; a
estrutura das pastas, em `project_design.md`, 4.2.

> **O repositório é público.** Nenhum nome real, senha, `config.json` ou arquivo de
> declaração vai para issues, comentários ou capturas de tela. A cópia preenchida
> deste roteiro também não: ela tem nomes e caminhos reais, e fica com quem coordena
> (o `.gitignore` barra arquivos com "preenchido" ou "preenchida" no nome). Ao
> relatar um problema, descreva-o com o elenco inventado (Helena Barros, Ana Beatriz
> Nunes, Carlos Eduardo Prado, Marina Duarte, Roberto Aguiar).

---

## 1. Antes do primeiro dia

### Coordenação

- [ ] Unidade escolhida: ________________________
- [ ] Pessoas que vão usar (todas da unidade): ____ pessoas
- [ ] Leitor (responsável pela área): ________________________
- [ ] Dois administradores do programa: ________________ e ________________
- [ ] Pelo menos um computador com **Chrome** e um com **Edge** entre os participantes.
- [ ] Data de início: ___/___/______ · Data de encerramento: ___/___/______

### TI — pastas

- [ ] Pasta administrativa criada: `\\________\________\`
      (caminho de rede completo, começando com `\\SERVIDOR\`, ou uma letra de
      unidade mapeada igual em todos os computadores, como `Z:\`. Um caminho que
      começa com uma barra só depende da unidade de cada computador.)
- [ ] `code\` com a pasta `code/` da **última tag** publicada (versão no rodapé de
      "Sobre o programa": ______).
- [ ] `code\catalogo.js` com `PASTA_REDE` trocado pelo caminho real de
      `Compartilhamento\` e `CATALOGO_ATUALIZADO` com a data do dia.
- [ ] `Compartilhamento\` criada, vazia, ao lado de `code\`.
- [ ] `Compartilhamento\declaracoes\` criada, vazia (o programa a criaria na primeira
      declaração, mas as permissões dela precisam existir antes).

### Se a prova começar sem as permissões NTFS

A prova pode começar antes de a TI aplicar as permissões — para não esperar e já
colher o uso do dia a dia —, desde que se saiba o que fica de fora:

- **Sem as permissões, nada fora do programa impede ninguém de mexer em nada.** Pelo
  Explorador do Windows, qualquer participante consegue abrir, alterar ou **apagar**
  qualquer arquivo de `Compartilhamento\` — o `config.json` e as declarações dos
  outros. O programa continua gravando só o arquivo de quem está identificado e só
  deixa administradores mudarem o cadastro; o que falta é a barreira de fora dele.
- **Enquanto isso, três cuidados:**
  - uma **cópia diária** de `Compartilhamento\` inteira, guardada fora dela, por quem
    coordena (ver "Ensaio de cópia de segurança" para restaurar);
  - pedir aos participantes que **não abram nem editem** os arquivos de
    `Compartilhamento\` pelo Explorador: tudo pelo programa;
  - se aparecer um arquivo de declaração que ninguém reconhece, ou um `config.json`
    alterado sem passar pela Administração, anotar e relatar (seção 4).
- **O que dá para conferir sem as permissões:** declarar, substituir, encerrar e
  excluir; ausências; o Painel, os CSV e o recorte do leitor (que é de tela); dois
  administradores salvando ao mesmo tempo; vários computadores, Chrome e Edge.
- **O que só se confere com elas:** a seção "TI — permissões" e a tabela "TI —
  conferência com duas contas de teste", logo abaixo. Elas são a razão principal da
  prova: **a prova só se encerra (seção 5) com as duas feitas**, numa segunda etapa,
  ainda na mesma pasta.

### TI — permissões

A receita é a de `project_design.md`, 4.2. Os comandos abaixo a aplicam com `icacls`,
o utilitário de permissões do próprio Windows. **Eles não foram testados num
servidor da organização**: revise-os, rode-os **primeiro numa pasta de teste** e só
depois na pasta da prova.

Troque os três grupos pelos da organização. Os demais nomes vão como SID, que vale em
Windows de qualquer idioma: `*S-1-5-32-544` é o grupo local **Administradores** e
`*S-1-3-0` é o **Criador proprietário**.

```bat
set PASTA=\\SERVIDOR\PastaAdministrativa
set USUARIOS=DOMINIO\Grupo-que-usa-o-programa
set ADMS=DOMINIO\Grupo-administradores-do-programa
set PUBLICA=DOMINIO\Grupo-que-publica-versoes

rem 1. Pasta administrativa: todos leem e listam (só esta pasta).
icacls "%PASTA%" /grant "%USUARIOS%:(RX)"

rem 2. code\: todos leem e executam; só quem publica versões modifica.
icacls "%PASTA%\code" /inheritance:r /grant "%USUARIOS%:(OI)(CI)RX" "%PUBLICA%:(OI)(CI)M" "*S-1-5-32-544:(OI)(CI)F"

rem 3. Compartilhamento\: todos leem; os administradores do programa modificam
rem    (gravam o config.json e o arquivo temporário .crswap do Chrome).
icacls "%PASTA%\Compartilhamento" /inheritance:r /grant "%USUARIOS%:(OI)(CI)RX" "%ADMS%:(OI)(CI)M" "*S-1-5-32-544:(OI)(CI)F"

rem 4. Compartilhamento\declaracoes\: todos leem, listam e CRIAM arquivos (só nesta
rem    pasta); cada arquivo só é modificado por quem o criou. Os administradores do
rem    programa só leem os arquivos dos outros.
icacls "%PASTA%\Compartilhamento\declaracoes" /inheritance:r /grant "%USUARIOS%:(RX,WD)" "%USUARIOS%:(OI)(IO)R" "*S-1-3-0:(OI)(IO)M" "%ADMS%:(OI)(CI)RX" "*S-1-5-32-544:(OI)(CI)F"

rem Conferência: listar o que ficou em cada pasta.
icacls "%PASTA%"
icacls "%PASTA%\code"
icacls "%PASTA%\Compartilhamento"
icacls "%PASTA%\Compartilhamento\declaracoes"
```

Pontos de atenção:

- **Todos os participantes**, inclusive leitores e administradores, precisam estar no
  grupo de `USUARIOS`: todos declaram, e é o grupo que dá o direito de criar o próprio
  arquivo em `declaracoes\`.
- **O Chrome grava por um arquivo temporário** (`nome-do-arquivo.crswap`) que depois
  põe no lugar do original. Por isso quem grava precisa **criar arquivos** na pasta, e
  não só modificar o próprio. É o motivo do `WD` no passo 4 e do `M` dos
  administradores no passo 3.
- **Permissões de compartilhamento:** se a pasta administrativa é um compartilhamento,
  as permissões do compartilhamento também valem. O mais simples é dar "Alterar" no
  compartilhamento aos três grupos e deixar o controle fino com o NTFS acima.
- **Limite conhecido:** como todos criam arquivos em `declaracoes\`, alguém poderia
  criar o arquivo de outra pessoa antes dela. O painel atribui cada arquivo pelo nome;
  nas propriedades do arquivo, o Windows mostra o proprietário de verdade.

### TI — conferência com duas contas de teste

Com uma conta comum (do grupo `USUARIOS`) e uma de administrador do programa:

| Teste | Conta comum | Administrador do programa |
|---|---|---|
| Abrir `code\index.html` | [ ] abre | [ ] abre |
| Gravar um arquivo qualquer em `code\` pelo Explorador | [ ] **negado** | [ ] **negado** |
| Conectar `Compartilhamento\` no programa | [ ] conecta, **sem** "somente para leitura" | [ ] idem |
| Oficializar a pasta (só o primeiro administrador) | — | [ ] cria o `config.json` |
| Primeira declaração | [ ] cria `declaracoes\<seu-nome>.json` | [ ] idem |
| Segunda gravação (encerrar ou registrar ausência) | [ ] grava | [ ] grava |
| Alterar o `config.json` pelo Explorador | [ ] **negado** | [ ] permitido |
| Alterar o arquivo de declaração **de outra pessoa** pelo Explorador | [ ] **negado** | [ ] **negado** |
| Apagar o arquivo de outra pessoa pelo Explorador | [ ] **negado** | [ ] **negado** |

Se algo der diferente do esperado, anote e abra um relato (seção 4) antes de seguir.

---

## 2. Primeiro dia

- [ ] O primeiro administrador abre `code\index.html`, conecta `Compartilhamento\` e
      oficializa a pasta (nome, unidade, senha).
- [ ] Na Administração: cadastra a unidade, todas as pessoas, o leitor (com a
      unidade) e o segundo administrador (com senha).
- [ ] Decide se a senha será exigida de todos (caixa "Exigir senha") e, se sim,
      define as senhas.
- [ ] Avisa os participantes: abrir `code\index.html`, conectar `Compartilhamento\`
      uma vez em cada computador, escolher o próprio nome.

---

## 3. Durante a prova (uma a duas semanas)

Cada participante, pelo menos uma vez:

- [ ] declara o próprio horário em "Meus horários";
- [ ] quem tem jornada partida declara manhã e tarde como duas declarações;
- [ ] alguém troca de horário usando **Substituir**;
- [ ] alguém registra uma ausência futura e a **exclui**; alguém registra uma ausência
      que já começou e a **encerra** antes;
- [ ] usa o programa em mais de um computador.

O leitor e os administradores:

- [ ] abrem o **Painel** numa data e num mês; conferem os indicadores contra a tabela;
- [ ] baixam os dois CSV (declarações e ausências) e abrem no Excel — acentos e
      colunas certos;
- [ ] o leitor confere que só vê a própria unidade;
- [ ] os dois administradores alteram o cadastro **ao mesmo tempo**, em computadores
      diferentes: o segundo a salvar recebe "Outro administrador alterou o cadastro",
      e nada se perde depois de "Atualizar dados da rede".

Se a intranet tem HTTPS:

- [ ] o programa servido por HTTPS abre, conecta a pasta e pode ser instalado como
      aplicativo; fechado e reaberto sem rede, abre do cache.

### Ensaio de cópia de segurança (numa CÓPIA, nunca na pasta da prova)

- [ ] Copiar `Compartilhamento\` para uma pasta de teste e, **num computador de
      teste**, conectar o programa nela. A cópia leva o mesmo selo do `config.json`, e
      o programa a aceita como se fosse a oficial — por isso o ensaio não se faz no
      computador de quem participa da prova, e no fim o computador de teste volta a
      conectar a pasta verdadeira ("Trocar pasta").
- [ ] Estragar o `config.json` da cópia (apagar o último `}`): o programa não deixa
      ninguém entrar e explica por quê.
- [ ] Pôr de volta o `config.json` bom: "Atualizar dados da rede" e tudo volta.
- [ ] Fazer o mesmo com o arquivo de declaração de uma pessoa: só ela fica sem
      gravar, e o arquivo danificado não é sobrescrito.

---

## 4. Como relatar um problema

Um relato por problema — tela, mensagem, permissão, texto confuso. No GitHub, use
**New issue → "Prova de uso: relato"**. Sem acesso ao GitHub, anote neste formato e
entregue a quem coordena:

- **O que você fazia:** (ex.: "registrava férias de 01/12 a 20/12")
- **O que esperava:**
- **O que aconteceu** (a mensagem, copiada como está):
- **Computador e navegador:** (Chrome ou Edge; aberto por duplo clique ou por HTTPS)
- **Papel:** pessoa, leitor ou administrador

Nunca nomes reais, senhas, nem o conteúdo dos arquivos.

---

## 5. Encerramento

- [ ] Todos os itens acima marcados — ou, os que não, com relato aberto e decisão.
- [ ] Se a prova começou sem as permissões NTFS: "TI — permissões" e "TI —
      conferência com duas contas de teste" feitas depois, na mesma pasta, sem
      perder nada do que foi declarado.
- [ ] Os ajustes encontrados publicados (v0.8 em diante) e conferidos na mesma pasta.
- [ ] No `project_design.md`, 10.3, o item **Prova de uso** marcado.
- [ ] Issue #20 fechada.

Com isso, a lista de publicação da v1.0 (10.3) fica completa: falta só trocar a
versão para 1.0 e marcar a *tag*.

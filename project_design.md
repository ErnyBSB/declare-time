# Declaração de disponibilidade
## Relatório de Projeto
### Versão 0 (pré-código) · Aplicação Web Progressiva (PWA) *client-side*

> Documento de referência para começar e evoluir o sistema.
> Destinado a desenvolvedores humanos e a modelos de IA.
>
> Este projeto nasce do **Programa de Resultados — COBIB**
> ([`ErnyBSB/resultados`](https://github.com/ErnyBSB/resultados), versão 1.16), de
> onde herda a arquitetura inteira e um recorte do escopo: a seção **Horários**,
> que lá entrou na v1.14 como parte de um programa maior, aqui vira o programa todo.
> Quando este documento diz "o projeto de origem", é àquele repositório que se
> refere, e as seções citadas (§2.2, §7.5…) são as do `Projeto_Design.md` dele.
>
> Ainda não há código. As seções 1 a 11 descrevem o sistema; a seção 12 registra
> as decisões que estavam em aberto e como foram resolvidas em 20/10/2026. Todas as
> que tocam esquema gravado estão tomadas, e só uma permanece pendente (12.7, o
> texto de finalidade da LGPD), que não cabe ao programa redigir. O documento acompanha o `code/`: quando o código existir, o texto passa a
> descrever a versão em uso, e as anteriores se recuperam pelas *tags*.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [O que se herda e o que fica para trás](#2-o-que-se-herda-e-o-que-fica-para-trás)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura de arquivos](#4-estrutura-de-arquivos)
5. [Modelo de dados (esquemas JSON)](#5-modelo-de-dados-esquemas-json)
6. [Perfis e permissões](#6-perfis-e-permissões)
7. [Interface](#7-interface)
8. [Painel: indicadores e gráficos](#8-painel-indicadores-e-gráficos)
9. [Segurança e suas fronteiras](#9-segurança-e-suas-fronteiras)
10. [PWA, execução e versionamento](#10-pwa-execução-e-versionamento)
11. [Limitações assumidas desde o início](#11-limitações-assumidas-desde-o-início)
12. [Decisões de projeto](#12-decisões-de-projeto)
13. [Roteiro de construção](#13-roteiro-de-construção)
14. [Glossário](#14-glossário)

---

## 1. Visão geral

**Objetivo.** Cada pessoa declara, ela mesma, **em que horários e em que períodos
estará em atividade** no ambiente de trabalho: por exemplo, "de 01/09 a 31/12, de
segunda a sexta, das 9h às 15h". Os **leitores** (responsáveis pela área de
trabalho e pessoas indicadas por eles) veem as declarações das suas unidades, e os
**administradores** veem o conjunto, em tabela e em gráficos: quem cobre cada hora de cada dia da semana, quantas horas por
semana cada pessoa declarou e quem ainda não declarou nada.

**O que o sistema não é.** A declaração é uma **previsão de disponibilidade, não um
registro de ponto**. O aplicativo não observa se o horário foi cumprido e não tem
como observar. Não há pontos, metas, aprovação nem cálculo de produtividade. A
regra vem do projeto de origem (§7.5): um horário declarado que alimentasse uma
métrica de desempenho viraria promessa que o programa não tem como conferir.

**Público.** Servidores públicos de uma unidade organizacional, usando estações
Windows com Chrome ou Edge e com acesso a uma pasta de rede comum. O README do
repositório resume: *app simples, sem servidor, para uso principalmente no serviço
público brasileiro.*

**Restrição fundamental.** **Nenhum servidor, nenhum banco, nenhum npm, nenhuma
etapa de build, nenhum CDN.** O aplicativo tem de rodar abrindo-se
`code/index.html` a partir de uma pasta. Os dados vivem em arquivos JSON numa pasta
de rede compartilhada, lidos e gravados diretamente pelo navegador por meio da File
System Access API. Qualquer proposta que acrescente servidor, gerenciador de pacotes
ou dependência de rede está fora de escopo e deve ser sinalizada como tal antes de
ser implementada.

### 1.1. Objetivos, em ordem de prioridade

Os cinco do projeto de origem, sem alteração de ordem:

1. **Zero infraestrutura.** Abrir o `index.html` de uma pasta basta.
2. **Nenhum conflito de escrita, por construção.** Um arquivo, um único escritor.
3. **Dados compatíveis para trás.** O que já foi gravado na pasta continua abrindo;
   campos novos são tratados pela ausência, nunca por migração.
4. **Legível para quem não é técnico.** Interface, comentários e documentação em
   **pt-BR**; a tela explica a recusa em vez de falhar em silêncio.
5. **Acessível e com pouca dependência.** Elemento nativo primeiro. Desde a v0.4,
   **nenhuma biblioteca**: os gráficos são HTML e CSS (12.6).

---

## 2. O que se herda e o que fica para trás

O projeto de origem levou dezesseis versões publicadas, e mais catorze betas, para
chegar às soluções abaixo. Várias delas corrigiram defeitos que apagavam dados em
silêncio. Herdá-las não é economia de esforço: é não pagar outra vez pelos mesmos
erros.

### 2.1. Herdado sem alteração de princípio

| Do projeto de origem | Por que vem junto |
|---|---|
| Pasta de rede + File System Access API + handle no IndexedDB | É a arquitetura; sem ela não há projeto "sem servidor". |
| **Um arquivo, um único escritor** (§2.2) | Única garantia de integridade sem banco. Aqui fica **mais simples**: sem cadeia de aprovação, não há leitura de dois lugares. |
| **Leitura estrita antes de gravar** (`lerArquivoParaGravar`, §3.2) | Arquivo inexistente e arquivo ilegível têm de ser respostas diferentes; confundi-los apagava o histórico da pessoa. |
| **Ponto único de escrita** do arquivo da pessoa (`atualizarArquivoPessoa`, §4.2) | Toda gravação lê o estado atual, aplica a mudança e regrava o conjunto. Uma chave nova esquecida na montagem do estado seria apagada pela gravação seguinte. |
| `lerConfig` com três estados: `ausente` / `ilegivel` / `ok` (v1.9) | Oficializar por cima de um `config.json` quebrado gravava a semente vazia sobre o cadastro real. |
| **Selo de instalação** (§9): `oficial` / `nao-oficializada` / `divergente` | O handle não se transfere entre máquinas; o selo garante que cada pessoa aponte para a pasta certa. |
| Senha como `sha256(nome + "|" + senha)`, com `exigirSenha` (§10.1) | Barreira contra uso casual, documentada honestamente como tal. |
| `escapar()` em todo texto vindo de fora, inclusive nas dicas dos gráficos (§10.2) | As sessões de administrador e de leitor exibem texto de outras pessoas, e a de administrador tem escrita ampla; uma observação lida como marcação executaria ali. |
| `[hidden]{display:none !important}` (§10.4) | Uma regra de `display` na folha vence o `hidden` do navegador. |
| `versao.js` como **único** lugar da versão (§3.6) | Etiqueta, janela "Sobre" e chave do cache derivam dele; versão escrita em dois lugares diverge. |
| `sw.js` *cache-first* com `importScripts("./versao.js")`, e catálogo **rede-first** com prazo (v1.10) | Uso offline sem congelar em silêncio o dado editável. |
| Manifesto e service worker só sob `http(s)` (v1.6) | Sob `file://` o Chrome nega o manifesto e enche o console. |
| `garantirPermissao()` de **escrita** ao conectar (v1.11) | `mode: "readwrite"` é pedido, não garantia: o navegador pode devolver a pasta só para leitura. |
| Data de atualização **manual** no `versao.js` | Buscá-la na rede contradiz o uso offline. |
| Ordem **alfabética** por padrão; "ordenar por volume" é opção (§8) | Ordenar por horas transforma o painel num *ranking* que o dado não sustenta. |
| Repositório público, sem dado interno (§10.5) e `.gitignore` como grade | Mesmo motivo, e o repositório novo também é público (CC0). |
| Elenco inventado nos exemplos e capturas | Helena Barros, Ana Beatriz Nunes, Carlos Eduardo Prado, Marina Duarte, Roberto Aguiar. |
| Versão por *tag*, nunca por pasta (§1.3) | O beta do projeto de origem mostrou o custo das cópias. |

### 2.2. O modelo de horário de §7.5 vem com as decisões dele

| Decisão do projeto de origem | Mantida? |
|---|---|
| **Uma faixa por dia**; jornada partida = duas declarações | Sim. Confirmado em 12.2. |
| Colisão só quando **período + dia da semana + hora** se cruzam | Sim. |
| Virada de meia-noite **recusada**, com explicação | Sim. |
| `carga` (jornada) **gravada dentro** da declaração, como retrato | Até a v0.4. **Removida na v0.5** (12.9): a jornada deixou de ser pedida. |
| Divergência entre faixa e jornada **exibida, nunca corrigida** | Até a v0.4. **Removida na v0.5** (12.9), junto com a jornada. |
| Indicador "sem declaração" tirado do **cadastro**, não das declarações | Sim. Uma lista só de quem declarou pareceria completa exatamente onde falta gente. |
| Mapa de cobertura conta **pessoas**, não registros, e a hora inteira | Sim. |

### 2.3. O que fica para trás

| Do projeto de origem | Por que não vem |
|---|---|
| Processos, atividades, complexidade, pontos, meta, `META_DIARIA` | Fora do escopo. |
| Lançamentos, aprovações, `aprovacoes.json`, cadeia servidor → chefia → geral | Não há o que aprovar: a declaração é da própria pessoa. |
| Papéis `chefia` e `geral` | Substituídos por `leitor`, que só lê as unidades que lhe forem atribuídas, e `adm` (seção 6). Nenhum dos dois aprova nada. |
| A **exceção** do administrador que grava em arquivo alheio para excluir (§2.2) | Aqui administradores e leitores **só leem** as declarações. O escritor único passa a valer **sem exceção nenhuma** nos arquivos de declaração. |
| Ausências | Vêm de volta na v0.5 (12.5), com tipos próprios (férias, licença, recesso, outro) e sem efeito em meta nenhuma: só tiram a pessoa da cobertura na data. |
| Recibo, busca de atividade, relatório impresso, capturas da Ajuda | Ou não se aplicam, ou entram depois (seção 13). |
| Pastas por unidade (`<UNIDADE>/lancamentos/`) | Sem chefia por unidade, a pasta por unidade não serve a nenhuma permissão. Ver 3.1. |

---

## 3. Arquitetura

Arquivos estáticos e toda a lógica no navegador, como no projeto de origem.

```
Navegador (Chrome/Edge) da pessoa A ─┐
Navegador (Chrome/Edge) da pessoa B ─┼─ ▶  …\Compartilhamento\  (dados, ver 4.2)
Navegador (Chrome/Edge) leitor, adm ─┘      (caminho exibido em PASTA_REDE)
                                              │
 Cada navegador:                              ├─ config.json        (só adms gravam)
 • abre …\code\index.html (o programa,        └─ declaracoes\
   ver 4.2) com versao.js, catalogo.js            ├─ ana-beatriz-nunes.json
   e rede.js                                      ├─ carlos-eduardo-prado.json
 • lê/grava JSON via File System Access API       └─ ...  (cada um, só o dono grava)
 • guarda o handle da pasta no IndexedDB
 • guarda identidade e preferências de tela
   no localStorage
```

### 3.1. Por que uma pasta só de declarações, e não uma por unidade

No projeto de origem a pasta por unidade existe para casar com permissões NTFS: a
chefia de cada unidade grava o `aprovacoes.json` dela, e a chefia geral grava só em
`GERAL/`. Aqui ninguém grava no arquivo de outra pessoa, e não há chefia. A unidade
continua existindo como **atributo** da pessoa (no cadastro e carimbada em cada
declaração), para que administradores filtrem e agrupem e para delimitar o que cada
leitor vê, mas não precisa virar
diretório.

A permissão NTFS recomendada fica numa linha: **cada pessoa com escrita apenas em
`declaracoes/<slug>.json`; os administradores com escrita em `config.json`; leitura
para todos os demais.** O recorte do leitor por unidade não tem par no NTFS: quem lê
a pasta lê todos os arquivos (ver seção 9).

Consequência: o nome do arquivo sai do `slug` do nome da pessoa, e dois nomes com o
mesmo `slug` (homônimos, ou nomes que só diferem em acento) cairiam no mesmo
arquivo. Por isso o cadastro **recusa** um nome cujo `slug` já esteja em uso e diz
qual é o nome conflitante (ver 6.2).

### 3.2. Onde cada tipo de estado vive

| Estado | Local | Escopo |
|---|---|---|
| Declarações e ausências de cada pessoa | `declaracoes/<slug>.json` | Compartilhado |
| Cadastro (unidades, pessoas, papéis, senhas, selo, interruptores) | `config.json` na raiz | Compartilhado |
| Rótulos dos dias, tipos de ausência, caminho exibido da pasta, semente | `catalogo.js` | Estático |
| Handle da pasta | IndexedDB, base `dt-rede`, chave `raiz` | Local ao navegador |
| Identidade confirmada | `localStorage` → `dt.identificacao.v1` | Local ao navegador |
| Selo aceito neste PC | `localStorage` → `dt.instalacao.v1` | Local ao navegador |
| Aba escolhida no painel | `localStorage` → `dt.aba.v1` | Local ao navegador |
| Cache offline | `dt-<versao>` | Local ao navegador |

**Por que o prefixo `dt.` e não `ra.`.** Os dois aplicativos podem acabar servidos
da **mesma origem**, por exemplo dois caminhos do mesmo servidor da intranet. Nesse
caso o `localStorage`, o IndexedDB e os caches são compartilhados entre eles, e o
`sw.js` de um, ao apagar "todo cache que não seja o meu", apagaria o do outro.
Prefixos diferentes evitam a colisão nas chaves. Também por isso o `activate` do
`sw.js` só apaga caches que **comecem com `dt-`**, ao contrário do original, que
apaga qualquer nome diferente do atual.

> **Nunca renomeie uma chave persistida**: nem de `localStorage`, nem de papel,
> nem de campo de JSON. Crie uma chave nova com sufixo de versão.

---

## 4. Estrutura de arquivos

```
code/                    o aplicativo: uma cópia só, sempre a versão atual
  index.html             interface, lógica e CSS embutido
  versao.js              o único lugar onde a versão é escrita
  catalogo.js            semente: rótulos, tipos de ausência, caminho da pasta, unidades vazias
  rede.js                acesso à pasta: handle, permissões, leitura/gravação de JSON
  sw.js                  service worker; chave do cache a partir do versao.js
  manifest.webmanifest   metadados do PWA
  gerar-senha.html       ferramenta avulsa: sha256("nome|senha")
  icons/                 icon-192.png, icon-512.png
  LEIA-ME.txt            o porquê de cada decisão, em prosa
testes/                  testes ponta a ponta no navegador (node testes/rodar.mjs)
project_design.md        este documento
CLAUDE.md                instruções para agentes de IA
README.md                apresentação curta
LICENSE                  CC0 1.0
.gitignore               barra config.json, declaracoes/, pastas de teste e *.local.js
```

Tudo num `index.html` só, pelo mesmo motivo do projeto de origem: sem build,
dividir em módulos exigiria `type=module`, e módulos não carregam por `file://`. O
escopo menor deve manter o arquivo bem abaixo das ~4.400 linhas do original.

### 4.1. O que copiar do projeto de origem como ponto de partida

Copia-se **código, não histórico**. Os dois repositórios são CC0, e não há
restrição de licença.

| Arquivo de origem | Tratamento |
|---|---|
| `rede.js` | Copiar e **podar**: sai tudo de lançamento, aprovação, ausência e unidade-como-pasta; ficam `salvarHandleRaiz`/`obterHandleRaiz`, `garantirPermissao`, `slug`, `lerJSONDe`/`gravarJSONEm`, `lerArquivoParaGravar`, `lerConfig` (três estados)/`gravarConfig`, e uma `lerTodasDeclaracoes()` nova. |
| `sw.js` | Copiar; trocar o prefixo do cache para `dt-` e restringir a limpeza do `activate` a esse prefixo (ver 3.2). |
| `versao.js` | Copiar a forma; recomeçar o número (ver 10.2). |
| `gerar-senha.html` | Copiar como está. |
| `echarts.min.js` | **Não copiar** (decidido na v0.4, ver 12.6): os gráficos são HTML e CSS. |
| `index.html` | **Não copiar inteiro.** Trazer por partes: folha de estilo e tokens, rail, tela de entrada (conexão, selo, identificação), `escapar`, `sha256hex`, a tela **Horários** e a aba **Horários** do painel, com seus dois gráficos. É dessa última parte que nasce o aplicativo. |
| `.gitignore` | Copiar, trocando `unidadeCentral/` por `pasta-teste/` e barrando também qualquer `declaracoes/`. |

### 4.2. Estrutura na rede (implantação)

O repositório acima é onde o programa é **feito**. Na organização, ele é **usado** a
partir de uma pasta de rede administrativa, compartilhada e com permissões NTFS, com
duas subpastas lado a lado:

```
\\SERVIDOR\<pasta administrativa>\     pasta de rede administrativa (NTFS)
  code\                                o PROGRAMA: cópia da pasta code/ de uma tag
    index.html                         o que as pessoas abrem (duplo clique)
    versao.js, catalogo.js, rede.js,
    sw.js, manifest.webmanifest,
    gerar-senha.html, icons\, LEIA-ME.txt
  Compartilhamento\                    os DADOS vivos: a pasta que cada pessoa conecta
    config.json                        cadastro, papéis, senhas, selo (só adms gravam)
    declaracoes\                       um arquivo por pessoa (só o dono grava)
      ana-beatriz-nunes.json           declarações e ausências da Ana
      carlos-eduardo-prado.json
      ...
```

- **`code\` é o programa, e só o programa.** Recebe a pasta `code/` de uma *tag*
  publicada (10.2), com o `catalogo.js` da organização (o `PASTA_REDE` real). As
  pessoas abrem `code\index.html`; ninguém conecta esta pasta na tela de entrada.
- **`Compartilhamento\` são os dados, e só os dados.** É a pasta escolhida em
  "Conectar pasta", oficializada pelo primeiro administrador (6.1) e apontada em
  `PASTA_REDE`. O programa não depende do nome: o que vale é o selo do `config.json`.
- **Uma não encosta na outra.** Publicar uma versão nova é substituir `code\` (com o
  cuidado de conservar o `catalogo.js` da organização); `Compartilhamento\` fica
  intocado. A cópia de segurança é a de `Compartilhamento\` inteira.

**Permissões NTFS, por pasta** (ponto de partida; conferir com a TI na prova de uso,
issue #20, como descreve a LEIA-ME):

| Pasta | Todos que usam o programa | Administradores do programa | Quem publica versões |
|---|---|---|---|
| `<pasta administrativa>\` | ler e listar | ler e listar | ler e listar |
| `code\` | ler e executar | ler e executar | modificar |
| `Compartilhamento\` | ler e listar | **modificar** (gravam o `config.json` e o `.crswap` temporário do Chrome) | ler e listar |
| `Compartilhamento\declaracoes\` | ler, listar e **criar arquivos** (só esta pasta); *Criador proprietário*: **modificar** (só arquivos) | ler e listar | ler e listar |

Ninguém além de quem publica grava em `code\`: uma cópia do programa alterada por
uma pessoa comum serviria a todos um `index.html` que ninguém revisou.

---

## 5. Modelo de dados (esquemas JSON)

Os esquemas abaixo são **o contrato com arquivos gravados por pessoas reais**.
Depois da primeira gravação em produção nenhuma chave muda de nome; por isso as
decisões da seção 12 que tocam esquema (12.1, 12.2 e 12.4) foram tomadas **antes**
do código. A lista completa das chaves, congelada para a v1.0, está em **5.6**, e o
teste `testes/06-contrato.mjs` falha se o programa gravar fora dela.

### 5.1. Declaração

Cada item do array `declaracoes`, no arquivo da própria pessoa:

```js
{
  id:       'dec-1757000000000-x3k9a',  // Date.now() + sufixo aleatório
  pessoa:   'Ana Beatriz Nunes',
  unidade:  'SEORE',                    // retrato do cadastro no momento
  de:       '2026-09-01',               // primeiro dia (inclusive), ISO
  ate:      '2026-12-31',               // último dia (inclusive), ou null = vigente
  dias:     [1, 2, 3, 4, 5],            // 0 = domingo, como Date.getUTCDay()
  inicio:   '09:00',                    // HH:MM, 24h
  fim:      '15:00',                    // HH:MM, 24h, sempre > inicio
  obs:      '',                         // opcional
  criadaEm: '2026-08-28T13:00:00.000Z'
}
```

Diferenças em relação ao horário do projeto de origem, todas deliberadas:

| Campo | Lá | Aqui | Por quê |
|---|---|---|---|
| `servidor` / `papel` | sim | **`pessoa`**, sem `papel` | Só há um papel que declara; e "servidor" presume vínculo que nem todo usuário tem (terceirizado, estagiário). |
| `ate` | obrigatório | **pode ser `null`** | Um horário de trabalho costuma valer "até nova declaração". Obrigar uma data final inventada faz a pessoa escolher 31/12 e o horário desaparecer em janeiro. Na colisão e nos gráficos, `null` vale como "sem fim". |
| `criadaEm` | não | sim | Permite ao administrador saber quando a declaração foi feita, não só quando vale. Também serve a "quem atualizou nos últimos 30 dias". |
| `carga` | sim | **não, desde a v0.5** | A jornada deixou de ser pedida (12.9). Declarações gravadas até a v0.4 continuam com a chave, que é lida como dado antigo e ignorada — nunca apagada (5.5). |

### 5.2. Arquivo de uma pessoa (`declaracoes/<slug>.json`)

```js
{
  formato:      1,                       // formato DO ARQUIVO; não é a versão do app
  pessoa:       'Ana Beatriz Nunes',
  unidade:      'SEORE',
  atualizadoEm: '2026-08-28T13:00:00.000Z',
  declaracoes:  [ { ...declaração... }, ... ],
  ausencias:    [ { ...ausência... }, ... ]  // desde a v0.5; ausente = nenhuma
}
```

Arquivos gravados até a v0.4 têm também `cargaHoraria` (8|6). A chave não é mais
escrita nem lida, e continua no arquivo: toda gravação parte do arquivo inteiro.

**Ausência** (cada item de `ausencias`, v0.5):

```js
{
  id:       'aus-1757000000000-k2m7p',
  pessoa:   'Ana Beatriz Nunes',
  unidade:  'SEORE',                    // retrato do cadastro no momento
  tipo:     'ferias',                   // chave de TIPOS_AUSENCIA (catalogo.js); nunca muda
  de:       '2026-12-01',               // primeiro dia (inclusive)
  ate:      '2026-12-30',               // último dia (inclusive); OBRIGATÓRIO
  obs:      '',
  criadaEm: '2026-11-10T13:00:00.000Z'
}
```

Mesmas regras de vida da declaração (12.4): a futura se exclui, a que está em curso se
encerra (só antecipando o fim, de hoje em diante), a passada fica. Duas ausências da
mesma pessoa não cobrem o mesmo dia. Ausência pode cruzar declarações: ela não as
encerra, só tira a pessoa da cobertura enquanto dura.

**Por que `formato` e não `versao`.** No projeto de origem o arquivo da pessoa tem
uma chave `versao` que é rótulo de formato (3, depois 4), enquanto `versao.js`
carrega a versão do aplicativo (1.16). As duas não têm relação, e o nome igual
convida a confundi-las. Aqui o nome diz o que a chave é.

**Ponto único de escrita.** Toda gravação passa por `atualizarArquivoPessoa(nome,
mudar)`, que lê com `lerArquivoParaGravar` (que pode lançar erro), monta o estado
**com todas as chaves do arquivo**, aplica a mudança e regrava. Uma chave nova no
arquivo exige mexer em três lugares: a leitura, a montagem do estado e a chamada de
gravação. Esquecer a montagem faz a chave nova ser apagada pela gravação seguinte,
em silêncio.

**Edição, encerramento, exclusão.** Decidido em 12.4: a pessoa **encerra** uma
declaração vigente (preenche `ate`) e **exclui** uma declaração que nunca valeu
(`de` > hoje). **Não edita** uma declaração que já começou, porque isso reescreve o
passado que o administrador consulta por mês. Trocar de horário é **substituir**:
encerrar a atual na véspera e declarar a nova a partir do dia seguinte, numa única
gravação.

**Chave reservada.** Fora da 1.0, mas com nome fixado desde já para não nascer com
outro: `realizados` (registro pontual, 12.1). Quando existir, terá esquema próprio e
não tocará em `declaracoes`. (`ausencias`, reservada até a v0.4, passou a ser usada
na v0.5.)

### 5.3. Configuração central (`config.json`)

```js
{
  formato:      1,
  atualizadoEm: '...',
  unidades:     ['SEORE', 'SEACE'],                  // só nomes
  pessoas: {
    'Ana Beatriz Nunes':   { unidade: 'SEORE' },                    // só declara
    'Helena Barros':       { unidade: 'SEORE', leitor: ['SEORE', 'SEACE'] },
    'Roberto Aguiar':      { unidade: 'SEACE', adm: true },
    ...
  },
  senhas:       { 'Nome': 'hash-sha256', ... },
  exigirSenha:  false,
  instalacao:   { id: 'uuid', por: 'Roberto Aguiar', em: '...' }
}
```

**Papéis como atributos da pessoa.** `leitor` (lista de unidades) e `adm` (`true`)
moram dentro de `pessoas[nome]`, e não em listas separadas de nomes. Assim,
renomear ou remover uma pessoa leva junto os papéis dela, e não sobra nome órfão
numa lista de administradores. Ausência da chave = sem o papel (5.5). Não existe
chave `pessoa`: estar no cadastro já é ser pessoa.

`pessoas` é um **mapa**, e não a lista por unidade do projeto de origem
(`unidades: {SEORE: {servidores: [...]}}`). Lá a lista por unidade espelhava a
pasta por unidade; aqui, sem pasta por unidade, o mapa torna impossível a mesma
pessoa constar em duas unidades e deixa espaço para atributos futuros sem mexer no
formato. São os administradores que gravam o `config.json`, e ele nunca é criado
automaticamente: criá-lo é o ato de oficializar a pasta (selo).

**Vários administradores, um arquivo.** Com mais de um `adm`, o `config.json` tem
um só **papel** escritor, mas várias **pessoas** escritoras. Para que uma não apague
a mudança da outra, `gravarConfig` relê o arquivo com leitura estrita e compara o
`atualizadoEm` lido com o que estava em memória quando a edição começou. Se mudou,
**recusa** a gravação, diz que outro administrador alterou o cadastro e pede
"Atualizar dados da rede" antes de refazer. A janela entre a releitura e a escrita
continua existindo (seção 11), mas fica da ordem de milissegundos, e não do tempo
de uma tela aberta.

### 5.4. `catalogo.js`

```js
const CATALOGO_ATUALIZADO = 'dd.mm.aaaa';
const TIPOS_AUSENCIA = [ { k: 'ferias', rotulo: 'Férias' }, { k: 'licenca', rotulo: 'Licença' },
                         { k: 'recesso', rotulo: 'Recesso' }, { k: 'outro', rotulo: 'Outro afastamento' } ];
const DIAS_SEMANA  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const UNIDADES     = [];                             // semente vazia (repo público)
const SENHAS       = {};
const EXIGIR_SENHA = false;
const PASTA_REDE   = '\\\\SERVIDOR\\PastaAdministrativa\\Compartilhamento';  // exemplo (4.2)
```

### 5.5. Compatibilidade para trás

Um campo que não existir num arquivo é tratado pela **ausência explícita**
(`(x && x.campo) || padrão`), nunca por migração ou reescrita do arquivo da pessoa.
Um arquivo só é regravado quando a própria pessoa grava algo nele, e toda gravação
parte do arquivo inteiro: chaves que esta versão não conhece atravessam intactas.

Já há arquivos antigos de verdade: os gravados até a v0.4 têm `cargaHoraria` no
cabeçalho e `carga` em cada declaração (12.9). Continuam abrindo, e as chaves ficam.

### 5.6. Contrato congelado (v1.0)

A partir da v1.0, estas são as chaves que o programa grava, e o que cada uma quer
dizer **não muda mais**. `formato` continua `1` nos dois tipos de arquivo.

| Arquivo | Chaves gravadas | Obrigatórias na leitura |
|---|---|---|
| `config.json` | `formato`, `atualizadoEm`, `unidades`, `pessoas`, `senhas`, `exigirSenha`, `instalacao` | `unidades` (lista), `pessoas` (mapa) |
| `config.json` → `pessoas[nome]` | `unidade`, `leitor` (lista de unidades), `adm` (`true`) | `unidade` |
| `config.json` → `instalacao` | `id`, `por`, `em` | `id` |
| `declaracoes/<slug>.json` | `formato`, `pessoa`, `unidade`, `atualizadoEm`, `declaracoes`, `ausencias` | `declaracoes` (lista) |
| declaração (5.1) | `id`, `pessoa`, `unidade`, `de`, `ate`, `dias`, `inicio`, `fim`, `obs`, `criadaEm` | `de`, `dias`, `inicio`, `fim` |
| ausência (5.2) | `id`, `pessoa`, `unidade`, `tipo`, `de`, `ate`, `obs`, `criadaEm` | `tipo`, `de`, `ate` |

Lidas mas não mais gravadas: `cargaHoraria` e `carga` (até a v0.4). Reservada e nunca
gravada: `realizados` (12.1). Valores fixos: as chaves `k` de `TIPOS_AUSENCIA`
(`ferias`, `licenca`, `recesso`, `outro`), os números de `dias` (0 = domingo) e os
papéis `leitor` e `adm`.

**Depois da v1.0, mudar o formato obedece a quatro regras:**

1. **Só acrescentar.** Chave nova entra com nome novo; nenhuma muda de nome, de tipo
   ou de significado, e nenhuma é reaproveitada para outra coisa.
2. **Ler pela ausência.** A versão que acrescenta uma chave lê com tranquilidade os
   arquivos que não a têm (5.5).
3. **Nunca migrar.** Nenhuma versão reescreve arquivos para "atualizá-los"; o arquivo
   muda só quando o dono grava algo nele, e então leva junto o que não conhecia.
4. **`formato: 2` só com leitor duplo.** Se um dia uma mudança não couber nas três
   regras acima, `formato` passa a 2, e a versão que grava 2 tem de continuar lendo
   1 — e a anterior tem de recusar gravar por cima de um 2 que não entende.

O teste `testes/06-contrato.mjs` grava pelo programa, pela tela, cada tipo de dado e
falha se aparecer chave fora desta tabela ou se uma chave desconhecida sumir.

---

## 6. Perfis e permissões

Três papéis, todos derivados do cadastro (5.3) e nunca escolhidos na tela. Os
papéis **se somam**: toda pessoa cadastrada declara, e `leitor` e `adm` são
permissões a mais sobre a mesma identidade. Uma chefe de seção que também é leitora
da sua unidade entra uma vez só e vê as duas coisas.

| Papel | Quantos | Declara? | Vê | Grava |
|---|---|---|---|---|
| **Pessoa** (`pessoa`) | Todas as pessoas do cadastro; cada uma declara **só por si** | Sim | As próprias declarações e o próprio resumo semanal | Só `declaracoes/<seu-slug>.json` |
| **Leitor** (`leitor`) | Vários por unidade; um leitor pode ter várias unidades | Sim (como pessoa) | Painel restrito às unidades da sua lista | Nada além do próprio arquivo |
| **Administrador** (`adm`) | Vários | Sim (como pessoa) | Todas as declarações, indicadores e gráficos; Administração | `config.json` e o próprio arquivo |

**Quem é leitor.** O responsável pela área de trabalho e as pessoas que ele indicar.
O programa não distingue os dois casos: quem indica é o responsável, quem cadastra
é um administrador.

**Escopo do leitor.** Uma declaração é visível ao leitor quando a **unidade
carimbada nela** (5.1) está na lista dele. Se a pessoa muda de unidade, o histórico
fica com a unidade antiga e as declarações novas vão para a nova, como no painel
por mês. O indicador "sem declaração" usa a unidade **atual** do cadastro.

Predicados no código: `ehPessoa()`, `ehLeitor()`, `ehAdm()`, `ehMeu(d)` e
`unidadesVisiveis()` (todas, para `adm`; a lista, para `leitor`; nenhuma, para quem
só declara), e nunca comparação de string de papel espalhada. A regra de alcance mora em `podeVer(v)`; esconder o item
do rail não é controle de acesso.

### 6.1. Passo a passo

1. **Conectar a pasta.** A escolha fica no IndexedDB; nas vezes seguintes basta
   "Reconectar". Sem permissão de escrita, a conexão não se completa e a tela diz o
   que conferir.
2. **Validar o selo.** Pasta não oficial: a tela só oferece **oficializar**; quem
   oficializa informa nome, unidade e senha, e vira o primeiro `adm` do
   `config.json` criado nesse ato. Pasta divergente: ninguém entra, e só um
   administrador do `config.json` da pasta pode adotá-la.
3. **Identificar-se.** Nome e senha, se houver. Quem tem `adm` sempre tem senha, com
   ou sem `exigirSenha`. Até a v0.4 pedia-se também a jornada (8h ou 6h); desde a
   v0.5, não (12.9), e entrar não grava nada — o arquivo da pessoa nasce na primeira
   declaração ou ausência.
4. **Declarar** (todos) e **consultar** o painel (leitor, nas suas unidades; adm, em tudo).
5. **Atualizar dados da rede.** Não há tempo real.

### 6.2. Administração

Qualquer administrador cadastra unidades e pessoas, atribui e retira os papéis
`leitor` (com a lista de unidades) e `adm`, define e remove senhas, liga a exigência
de senha e oficializa a pasta. Atribuir `adm` a alguém sem senha pede a senha no
mesmo ato. O cadastro **recusa retirar o último `adm`**, porque ninguém mais
conseguiria entrar na Administração. Administradores **não excluem declarações**: a exceção que o projeto
de origem abria para corrigir erros não faz falta num dado que a própria pessoa
pode encerrar ou excluir. Isso deixa o escritor único sem exceção nenhuma.

**Renomear ou remover pessoa** desliga do cadastro o arquivo dela, sem apagá-lo. Se
o arquivo continuar na pasta, o painel o mostra numa seção "arquivos sem cadastro",
para que não desapareça em silêncio.

---

## 7. Interface

Rail fixo à esquerda e telas, como o projeto de origem desde a v14. Tokens de cor em
`:root` com nomes pt-BR (`--tinta`, `--papel`, `--ficha`, `--verde`,
`--grafite`, `--linha`, `--linha-campo`, `--raio`).

**O significado das cores muda.** No projeto de origem, verde é aprovado e dourado é
pendente. Aqui não há aprovação, e as duas cores ficam livres para significados
novos, que precisam ser fixados e não reaproveitados decorativamente. Fixado:
**verde = declaração vigente.** Dourado marcava a divergência entre a faixa e a
jornada até a v0.4; saiu com a jornada (12.9), e o token foi retirado da paleta.

### 7.1. Telas

| Tela | Quem | O que mostra |
|---|---|---|
| **Entrada** | todos | Pasta e identificação. Some quando as duas se resolvem. |
| **Meus horários** | pessoa | Formulário à esquerda: período (`de`, `ate` opcional), dias da semana, faixa de horas, observação. O total ("6h por dia · 30h por semana") é calculado enquanto se digita. À direita, as declarações separadas em *vigentes*, *futuras* e *encerradas*, cada uma com a ação permitida (encerrar, substituir ou excluir; ver 12.4). Abaixo, o registro de **ausências** (tipo, período, observação) e a lista delas (em curso e futuras; passadas), e uma grade semanal simples, em HTML, com o que está vigente hoje — avisando se a pessoa está ausente. |
| **Painel** | leitor, adm | Filtros (data de referência ou mês, unidade, pessoa); indicadores (com **ausentes**); os gráficos da seção 8; tabelas de declarações e de ausências; exportação CSV de cada uma. Para o leitor, tudo restrito a `unidadesVisiveis()`, e o filtro de unidade só oferece essas. |
| **Administração** | adm | Selo, cadastro de unidades e pessoas, papéis (`leitor` e suas unidades, `adm`), senhas. |
| **Ajuda** e **Sobre** | todos, antes da identificação inclusive | Texto curto; "Sobre" mostra `versao.js` e `CATALOGO_ATUALIZADO`. |

### 7.2. Recusas que a tela explica

Cada uma com mensagem própria, nunca falha silenciosa:

- `fim` ≤ `inicio`: "a faixa termina antes de começar; jornada que passa da
  meia-noite se declara como dois horários";
- nenhum dia da semana marcado;
- `ate` anterior a `de`;
- dias marcados que não ocorrem dentro do período;
- colisão com outra declaração da mesma pessoa, citando qual (período + dia + hora, com o
  dia em comum ocorrendo no trecho em que os períodos se sobrepõem);
- arquivo da pessoa ilegível: não grava, cita o nome do arquivo e manda procurar o
  administrador;
- `config.json` ilegível: ninguém entra, administradores inclusive;
- `config.json` alterado por outro administrador desde que a tela foi aberta: não
  grava e pede "Atualizar dados da rede" (5.3);
- retirar o papel `adm` do último administrador;
- leitor sem nenhuma unidade na lista;
- navegador sem File System Access API: diz que é preciso Chrome ou Edge.

---

## 8. Painel: indicadores e gráficos

O mesmo painel serve a leitores e administradores. A única diferença é o
**recorte**: o administrador vê todas as unidades, e o leitor só as de
`unidadesVisiveis()` (seção 6), em indicadores, gráficos, tabela e CSV. A seção
"arquivos sem cadastro" é só do administrador.

Tudo sai dos **mesmos dados da tabela**. Se gráfico e tabela divergirem, é defeito.
Os gráficos servem para achar onde olhar; o número exato está na tabela e no CSV.

**Recorte temporal.** Uma declaração vale num intervalo, então todo gráfico
responde a uma pergunta "em quando?". O filtro principal é uma **data de
referência** (padrão: hoje), e entram as declarações vigentes nela. Um filtro de
**mês** alternativo considera as declarações que encostam no mês em qualquer dia,
como as ausências do projeto de origem.

**Fixado na v0.3.** As declarações são atribuídas ao **dono do arquivo** (o nome do
cadastro cujo `slug` dá o nome do arquivo), nunca ao campo `pessoa` gravado dentro
dele. Declaração com forma inválida fica fora das contas, sem derrubar a tela, e
continua no arquivo. A tabela entra pela unidade **carimbada**; o cadastro, pela
unidade **atual**.

### 8.1. Indicadores

- **Pessoas cadastradas** (do `config.json`, nas unidades visíveis);
- **Com declaração vigente** na data de referência;
- **Sem declaração**: calculado a partir do cadastro e clicável, para listar quem
  falta;
- **Horas por semana declaradas**, no total e em média por pessoa com declaração —
  só no recorte por data: no recorte por mês, as declarações sucessivas de quem
  substituiu o horário se somariam.

"Sem declaração" não conta quem tem arquivo **ilegível** (listado à parte, com a
marca) nem quem tem declaração no período carimbada com outra unidade (mudou de
unidade e não redeclarou); o indicador "com declaração" diz quantos estão nesse
caso.

### 8.2. Gráficos

1. **Cobertura por hora e dia da semana**: mapa de calor que conta **pessoas**,
   herdado sem mudança. Eixo de horas só entre a primeira e a última hora usadas;
   sábado e domingo só se alguém os usar; zero escrito dentro da célula, porque
   significa *hora descoberta*. Filtrável por unidade.
2. **Horas por semana, por pessoa**: barra horizontal, em ordem **alfabética** por
   padrão e "ordenar por volume" como opção. Uma cor só; a referência da jornada × 5
   saiu com a jornada (12.9).
3. **Linha do tempo das declarações**: uma faixa por pessoa no eixo das datas,
   mostrando os períodos declarados, os buracos e as sobreposições entre
   declarações sucessivas. É o único gráfico **novo**, e o que responde à parte
   "períodos" do escopo. A janela é o mês escolhido ou, numa data, três meses para
   cada lado; declarações que valem ao mesmo tempo ficam em raias, uma sob a outra,
   e as ausências em raias próprias, com textura a 45°.

Os três são **HTML e CSS** (12.6), saem do mesmo recorte da tabela e têm dica no
ponteiro e no foco do teclado, preenchida por `textContent`. A cobertura usa uma
rampa de um só verde (conferida: monótona, degraus visíveis, o tom claro a 2,1:1 do
branco), com o zero em cinza e o número escrito; as barras são de tinta neutra. As
horas por semana só aparecem no recorte por data.

**Ausências no painel (v0.5).** Num recorte por **data**, quem está ausente nela sai
da cobertura — mas a grade (horas e dias) continua saindo de todas as declarações,
para que a hora que só o ausente cobria apareça como **zero**, e não suma. A nota do
gráfico diz quem saiu da conta. Num recorte por **mês**, ninguém sai: uma ausência de
uma semana não apaga as outras três, e a nota diz isso. O indicador **Ausentes**
conta as pessoas do recorte ausentes na data (ou com ausência no mês), e a tabela de
declarações marca "ausente: férias" ao lado da declaração de quem está fora.

**A nota embaixo de cada gráfico diz o que ele não é**: horário declarado não é
horário cumprido, e o mapa de cobertura não desconta feriados.

### 8.3. Exportação

CSV com uma linha por declaração, colunas na ordem do esquema 5.1, com `dias` por
extenso ("Seg Ter Qua"). Separador `;` e BOM UTF-8, para o Excel em pt-BR abrir sem
assistente. Célula que comece com `=`, `+`, `-` ou `@` ganha um apóstrofo na frente,
para o Excel não a executar como fórmula.

---

## 9. Segurança e suas fronteiras

Mesmo princípio honesto do projeto de origem: senha, papel e selo impedem o uso
**acidental ou casual**, mas não constituem controle de acesso forte. O código roda
no cliente e os dados são arquivos numa pasta. A barreira real é a permissão NTFS
(3.1), e o desenho de escrita foi feito para caber nela. O **recorte do leitor**
por unidade é só de tela: com leitura para todos na pasta, um leitor que abra os
arquivos fora do aplicativo lê as declarações de qualquer unidade. Toda funcionalidade nova
responde: *com as permissões recomendadas, esta gravação ainda passa?*

O que nunca vai para o repositório, que é **público**: nome real de pessoa, senha
(nem em hash), `config.json`, arquivo de declaração. O `catalogo.js` é semente
vazia; o `.gitignore` é a grade que barra um `git add -A` distraído.

**Dado pessoal.** O horário em que alguém está no trabalho é dado pessoal no
sentido da LGPD. A finalidade (organizar a cobertura do serviço), quem lê
(leitores, nas suas unidades, e administradores) e o fato de ser **autodeclarado** devem estar escritos na tela de
Ajuda. Ver 12.7.

---

## 10. PWA, execução e versionamento

### 10.1. Execução

Igual ao projeto de origem, §11: duplo clique no `code/index.html` habilita tudo,
inclusive a pasta (`file://` é contexto seguro). Instalação e cache offline exigem
`http(s)` ou `localhost`, e o registro do service worker e o `<link
rel="manifest">` ficam condicionados a `location.protocol.startsWith("http")`.
**Servir pela intranet exige HTTPS**: sob `http://` que não seja `localhost`, a
`showDirectoryPicker` não existe.

**Verificação.** Há testes ponta a ponta em `testes/`, rodados com
`node testes/rodar.mjs` (ou só algumas suítes: `node testes/rodar.mjs 02 05`). Eles
sobem um servidor HTTP mínimo para `code/` e um Chrome sem tela, simulam a pasta da
rede com o OPFS do navegador — o `rede.js` de verdade lê e grava arquivos de verdade —
e falham também com qualquer erro no console da página. Só usam módulos do Node 22
(nenhum pacote npm): o Node é ferramenta de quem mantém o programa, nunca dependência
do aplicativo. `CHROME=` indica o navegador; `FOTOS=<pasta>` guarda capturas de tela
para conferir o layout a olho.

Os testes não substituem a conferência à mão: abrir o `index.html` no Chrome contra
uma pasta local de teste com `declaracoes/` (a `pasta-teste/`, já no `.gitignore`), em
várias abas, alternando entre pessoa, leitor e administrador, e com dois
administradores gravando o cadastro. JS avulso se confere com `node --check`. Ao
mexer em arquivo cacheado, use recarregamento forçado.

### 10.2. Versões

**Versão é *tag*, e o número só existe em `versao.js`.** Publicar são duas edições
que precisam concordar: `versao.js` (`versao`, `rotulo`, `atualizado`) e
`git tag -a vX.Y`.

**Numeração.** `0.x` enquanto o aplicativo não tiver sido usado com dados
reais (v0.1, v0.2…), e **v1.0** no primeiro uso em produção. O projeto de origem
fez seus betas fora do repositório e chegou à 1.0 com o formato dos dados já
assentado. Aqui os betas ficam dentro, e a 1.0 marca o ponto a partir do qual o
esquema da seção 5 não muda mais de nome.

**Branches e commits.** Uma branch por versão em andamento, mesclada em `main` por
PR e então marcada com a *tag*. Commits seguem Conventional Commits e são escritos
em **inglês**; interface, comentários e documentação, em pt-BR. O assunto descreve a
mudança visível para quem usa; o corpo argumenta o porquê; o rodapé leva
`Refs: #<issue>`. (O `Projeto_Design.md` de origem diz "commits em pt-BR" no §13.1,
o que contradiz o `CLAUDE.md` dele e a própria história do repositório. Aqui vale o
inglês.)

**Documentos.** Como no projeto de origem: `code/LEIA-ME.txt` argumenta cada
decisão em prosa e muda a cada alteração de comportamento; este
`project_design.md` é a referência estruturada e muda quando arquitetura, modelo de
dados, perfis ou limitações mudam. Ao publicar uma *tag*, acrescenta-se uma linha ao
histórico abaixo.

### 10.3. Lista de publicação da v1.0

A v1.0 marca o primeiro uso em produção, e depois dela o formato (5.6) não muda de
nome. Só se marca a *tag* com tudo isto feito:

- [x] Contrato dos arquivos escrito (5.6) e conferido por `testes/06-contrato.mjs`.
- [x] A 1.x recusa gravar por cima de arquivo de formato mais novo (5.6, regra 4).
- [x] LEIA-ME completo, com instalação, permissões, cópia de segurança e publicação.
- [ ] **Prova de uso** (fase 5): uma unidade real, numa pasta real, com as permissões
      NTFS da LEIA-ME aplicadas e conferidas pela TI; ajustes do que aparecer.
- [ ] **Texto de finalidade da LGPD** na Ajuda, redigido pela área responsável
      (12.7, issue #17), e o teste de 01 atualizado.
- [ ] `node testes/rodar.mjs` passando, e conferência à mão em várias abas.
- [ ] `versao.js` em `1.0` (`versao`, `rotulo`, `atualizado`) e `git tag -a v1.0` no
      `main`, com a linha da v1.0 no histórico abaixo.

### 10.4. Histórico de versões

| Versão | Data | O que entrou |
|---|---|---|
| v0.1 | out/2026 | Entrada (conexão, selo, oficialização pelo primeiro administrador, identificação com jornada), Administração (unidades, pessoas, papéis `leitor`/`adm`, senhas, conferência de `atualizadoEm`), Ajuda, Sobre, PWA. |
| v0.2 | out/2026 | Meus horários: formulário com total ao vivo, recusas de 7.2, colisão conferida contra o arquivo relido, encerrar/substituir/excluir, divergência por dia, grade da semana. |
| v0.3 | out/2026 | Painel para leitores (recorte pelas suas unidades) e administradores: data ou mês, unidade, pessoa; indicadores; "sem declaração" pelo cadastro; tabela; CSV; arquivos sem cadastro ou ilegíveis. |
| v0.4 | out/2026 | Gráficos do painel em HTML/CSS, sem biblioteca: cobertura por hora e dia (pessoas distintas, zero = descoberta), horas por semana por pessoa com jornada × 5, linha do tempo com raias. |
| v0.5 | out/2026 | Sem jornada (12.9) e sem o dourado; "Sobre" sem o crédito ao projeto de origem; ausências (férias, licença, recesso, outro) em Meus horários e no painel, descontadas da cobertura na data (#13). |
| v0.6 | out/2026 | Preparação da 1.0: contrato dos arquivos congelado (5.6) e conferido por `testes/06-contrato.mjs`; recusa de gravar por cima de formato mais novo; testes no navegador no repositório; guia de instalação, permissões, cópia de segurança e publicação na LEIA-ME; lista de publicação da 1.0 (10.3). |

---

## 11. Limitações assumidas desde o início

- **Somente Chrome/Edge**, pela File System Access API.
- **Sem tempo real**: "Atualizar dados da rede" relê os arquivos.
- **Cada pessoa aponta a pasta uma vez por PC**: o handle não se transfere.
- **Autodeclarado**: nem horário nem ausência são conferidos contra RH ou ponto, e
  não vão ser. Conferir exigiria registro de ponto, que este programa não é.
- **Sem feriados** no mapa de cobertura: uma segunda-feira feriada conta como
  qualquer outra.
- **Hora inteira** no mapa: quem sai às 12h30 conta na hora das 12h.
- **Ausências só descontam numa data**: no recorte por mês, quem esteve de férias
  parte do mês continua contando na cobertura daquele mês.
- **Segurança dependente de NTFS**: sem as permissões, o controle é só contra uso
  casual. O recorte do leitor por unidade nunca passa de controle de tela.
- **Administradores simultâneos**: a releitura antes de gravar (5.3) recusa a
  maioria dos conflitos no `config.json`, mas duas gravações no mesmo instante
  ainda podem se sobrepor, e a última vence.
- **Cache pegajoso**: publicar sem trocar a versão no `versao.js` continua servindo a
  anterior.

---

## 12. Decisões de projeto

Registro das decisões que este documento deixou em aberto na versão pré-código.
As que tocam esquema gravado (12.1, 12.2, 12.4) foram tomadas em **20/10/2026**,
antes do código, e as demais seguiram a recomendação de cada item. Fica pendente
só **12.7**, que depende de quem responde pelo dado no órgão. A 12.3 foi revista
no mesmo dia, ao se definirem os três papéis. Cada item guarda as
alternativas descartadas, para que a decisão não seja refeita sem o argumento.

### 12.1. Previsão ou realização? — **Decidido: previsão recorrente**

"Declarar períodos de atividade" podia significar duas coisas:

- **(a) previsão recorrente:** "de set. a dez., seg–sex, 9h–15h". É o modelo deste
  documento, herdado de §7.5.
- **(b) realização pontual:** "em 14/10 estive em atividade das 9h às 12h e das 13h
  às 16h". Isso se aproxima de registro de ponto, com as implicações de controle de
  frequência que o projeto de origem evitou de propósito.

**Decisão: (a), e só (a), na 1.0.** Se (b) vier a ser pedido, entra no mesmo
arquivo como **segunda chave**, `realizados: []`, com esquema próprio e sem tocar
em `declaracoes`. O nome da chave fica reservado desde já (5.2), e por isso não
haverá migração.

### 12.2. Uma faixa por dia, ou várias? — **Decidido: uma faixa**

Herdada: jornada partida vira duas declarações. É chave gravada (`inicio`/`fim`
escalares, e não `faixas: [...]`). O projeto de origem decidiu antes do código e
não teve queixa registrada até a 1.16.

**Decisão: manter uma faixa por declaração.** A jornada partida é declarada como
duas declarações, e a colisão entre elas segue a regra de 2.2 (período + dia da
semana + hora).

### 12.3. Só o administrador vê o conjunto? — **Decidido: três papéis já na 1.0**

O pedido diz que o administrador visualiza tudo. Numa organização com várias
unidades, a pergunta seguinte costuma ser "e a chefia da unidade?". Um papel
**leitor** por unidade, que lê e não grava nada, cabe sem quebrar o escritor único,
porque só lê.

A primeira resposta foi deixar o `leitor` para depois da 1.0, só com o nome
reservado. **Decisão revista (20/10/2026):** a 1.0 nasce com três papéis
cumulativos (seção 6):

- **pessoa**: toda pessoa cadastrada; declara só por si;
- **leitor**: responsáveis pela área de trabalho e pessoas indicadas; vários por
  unidade, cada um com uma ou mais unidades;
- **adm**: vê tudo e mantém o cadastro; vários.

Consequência aceita: com vários administradores, o `config.json` passa a ter mais
de uma pessoa escritora, e a gravação ganha a conferência de `atualizadoEm` (5.3).

### 12.4. Editar, encerrar, excluir — **Decidido: a proposta da 5.2**

**Decisão:**

- **excluir** só declaração que ainda não começou (`de` > hoje);
- **encerrar** (preencher `ate`) a vigente;
- **nunca editar** a que já começou;
- trocar de horário é **substituir**: um botão que encerra a atual na véspera da
  nova data (por exemplo, em 30/09) e declara a nova a partir dela (01/10), as duas
  coisas **numa única gravação** por `atualizarArquivoPessoa`.

Limites fixados na v0.2: encerrar escolhe um último dia **de hoje em diante**, que
só antecipa o fim já existente; substituir começa **hoje ou depois**, e depois do
início da atual. Declarar um período que começou no passado é permitido (adoção do
programa no meio do semestre), com aviso de que a declaração não poderá ser excluída.
A situação (vigente, futura, encerrada) é calculada contra hoje, nunca gravada.

Alternativa descartada: edição livre. É mais simples na tela, mas apaga o histórico
que o painel consulta por mês.

### 12.5. Ausências — **Decidido: entram na v0.5** (revisto em 21/10/2026, #13)

A primeira decisão as deixava para depois da 1.0, com a chave reservada. Revista a
pedido no uso da v0.4: **entram na v0.5**, na forma prevista — período + tipo, chaves
`k` imutáveis em `TIPOS_AUSENCIA` (férias, licença, recesso, outro), no arquivo da
própria pessoa, chave **`ausencias`** (esquema em 5.2). Último dia obrigatório; sem
sobreposição entre ausências da mesma pessoa; encerrar e excluir como as declarações.
O mapa de cobertura passa a descontá-las no recorte por data (8.2).

### 12.6. Como desenhar os gráficos — **Decidido: HTML/CSS puro, sem ECharts**

O `echarts.min.js` herdado é uma compilação só-canvas com barra e mapa de calor, sem
a série `custom` que um Gantt pediria. Opções consideradas:

- **(a) HTML/CSS puro:** uma grade com uma linha por pessoa e blocos posicionados
  por porcentagem. Sem dependência, imprime bem e é acessível com `role="img"` e
  texto alternativo por linha.
- **(b) barra empilhada do ECharts** com um segmento transparente como espaçador:
  funciona com a compilação atual, mas a dica e a acessibilidade ficam piores.
- **(c) recompilar o ECharts** com `custom`: aumenta o arquivo e o cache offline.

**Decisão: (a).** E, revisto ao começar a v0.4 (21/10/2026), a mesma decisão vale para
os outros dois gráficos: o `echarts.min.js` do projeto de origem **não é copiado**.
Motivos: é uma compilação própria de 533 KB, minificada, sem cabeçalho de licença
(o ECharts é Apache-2.0) nem registro da versão; e o que este programa desenha — um
mapa de calor, que é uma tabela, e barras horizontais — não justifica o arquivo no
cache offline. Em HTML, o conteúdo é texto de verdade: lê em leitor de tela, imprime
e funciona sem rede. Saem junto as regras herdadas que só existiam por causa do
ECharts (desenho adiado em contêiner oculto, compilação só-canvas).

### 12.7. Texto de finalidade (LGPD) — **Pendente**

Quem redige a finalidade e a base legal exibidas na Ajuda: a gestão ou o
encarregado de dados do órgão? O programa não deve inventar esse texto. Até lá, a
Ajuda traz um marcador explícito de texto pendente. Precisa de resposta antes da
v1.0 (seção 13).

### 12.8. Nome do produto — **Decidido: "Declaração de disponibilidade"**

O repositório se chama `declare-time`, mas a interface é pt-BR.

**Decisão (revista em 20/10/2026):** título **"Declaração de disponibilidade"**
(`name` no manifesto e `<title>`), `short_name` **"Disponibilidade"** no
manifesto. A primeira proposta, "Declaração de Horários", foi trocada porque o
que se declara é **disponibilidade** prevista, e não horário cumprido (seção 1). O nome do repositório continua
`declare-time`.

### 12.9. Jornada (8h ou 6h) — **Decidido: removida na v0.5** (21/10/2026, #13)

A jornada era pedida na entrada, carimbada em cada declaração (`carga`) e usada para
marcar em dourado o dia cujo total não batia com ela. No uso da v0.4, pediu-se que
não fosse mais perguntada. **Decisão:** sai da entrada, do formulário e do painel; a
comparação em dourado sai junto, porque sem jornada não há com o que comparar.
Alternativa descartada: comparar com uma semana-padrão definida por unidade — mais
cadastro para manter, para uma marcação que o programa não usa em conta nenhuma.

O que já foi gravado fica (5.5): `cargaHoraria` no arquivo da pessoa e `carga` nas
declarações antigas continuam lá, intocados, e deixam de ser lidos. Como
consequência, entrar não grava mais nada: o arquivo da pessoa nasce na primeira
declaração ou ausência.

---

## 13. Roteiro de construção

| Fase | Entrega | Tag |
|---|---|---|
| **0. Repositório** | `.gitignore`, `CLAUDE.md` (adaptado do de origem: objetivos da 1.1, convenções, "Do not"), `code/` com `versao.js`, `catalogo.js` semente e `LEIA-ME.txt` inicial. (12.1, 12.2 e 12.4 respondidas em 20/10/2026.) | — |
| **1. Entrada** | `rede.js` podado, `sw.js`, manifesto, ícones; telas de Entrada, Sobre e Ajuda; conexão, selo, identificação com jornada; Administração (cadastro, papéis `leitor`/`adm`, senhas, conferência de `atualizadoEm`). | v0.1 |
| **2. Declarar** | Tela *Meus horários*: formulário, total ao vivo, recusas de 7.2, colisão, encerrar/excluir/substituir, grade semanal. `atualizarArquivoPessoa`. | v0.2 |
| **3. Painel** | Filtros, indicadores, tabela, CSV, "arquivos sem cadastro"; recorte por `unidadesVisiveis()` para o leitor. | v0.3 |
| **4. Gráficos** | Mapa de cobertura, horas por semana, linha do tempo, todos em HTML/CSS (12.6). | v0.4 |
| **5. Prova de uso** | Teste com uma unidade real, numa pasta real, com permissões NTFS aplicadas. Ajustes — o primeiro lote (#13: jornada, crédito, ausências) saiu na v0.5. | v0.5… |
| **6. Produção** | Esquema congelado, LEIA-ME completo, Ajuda com o texto de 12.7. Preparada em out/2026 (contrato 5.6, teste 06, guia de instalação na LEIA-ME); a *tag* espera a lista de 10.3. | **v1.0** |

Depois da 1.0, nesta ordem de custo/benefício: relatório impresso (o mecanismo da
v1.13 de origem) e tabela de feriados opcional. (Ausências, antes nesta lista,
entraram na v0.5.)

---

## 14. Glossário

| Termo | Significado aqui |
|---|---|
| **Declaração** | Um período + dias da semana + uma faixa de horas em que a pessoa diz que estará em atividade. |
| **Vigente** | Declaração cujo intervalo `de`…`ate` contém a data de referência (`ate` nulo = sem fim). |
| **Ausência** | Período de férias, licença, recesso ou outro afastamento declarado pela própria pessoa. Tira a pessoa da cobertura na data. |
| **Jornada / carga** | Horas por dia (8 ou 6) pedidas até a v0.4; removidas na v0.5 (12.9). Ficam nos arquivos antigos, sem uso. |
| **Encerrar** | Preencher `ate` numa declaração vigente. Única alteração permitida depois que ela começou. |
| **Excluir** | Apagar uma declaração que ainda não começou (`de` > hoje). |
| **Substituir** | Encerrar a vigente na véspera e declarar a nova, numa só gravação. |
| **Cobertura** | Quantas pessoas declararam estar em atividade numa hora de um dia da semana. |
| **Selo** | UUID gravado no `config.json` que identifica a pasta oficial. |
| **Escritor único** | Regra pela qual cada arquivo tem um só papel que o grava. Nos arquivos de declaração, também uma só pessoa; no `config.json`, vários administradores, com conferência de `atualizadoEm`. |
| **Pessoa** | Quem está no cadastro. Declara só os próprios horários. |
| **Leitor** | Pessoa com o papel `leitor`: vê o painel restrito às unidades da sua lista. |
| **Administrador** | Pessoa com o papel `adm`: vê tudo e mantém o cadastro. Pode haver vários. |
| **Projeto de origem** | `ErnyBSB/resultados`, Programa de Resultados — COBIB, v1.16. |

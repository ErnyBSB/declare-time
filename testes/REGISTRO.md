# Registro das execuções dos testes

Cada versão publicada (*tag*) ganha aqui uma linha com o resultado de
`node testes/rodar.mjs` sobre o código daquela *tag*, e a saída completa vai para
`testes/resultados/<data>_<versão>.txt`. Execuções do dia a dia não entram: são para
quem está mudando o código, e o `.gitignore` barra os `resultado-testes*.txt` soltos.

O registro responde a uma pergunta que a *tag* sozinha não responde: **esta versão
passou nos testes, em que ambiente, e com quantas conferências?** Ele não substitui a
conferência à mão nem a prova de uso (`prova-de-uso/ROTEIRO.md`).

## Execuções

| Data | Versão | Commit | Ambiente | Resultado | Saída |
|---|---|---|---|---|---|
| 26/10/2026 | v0.8 | `9bbf780` | Ubuntu 24.04.5 LTS · Node 22.17.1 · Google Chrome 155.0.8059.79 (headless) | **189 conferências, 0 falhas**, nenhum erro no console | [`2026-10-26_v0.8.txt`](resultados/2026-10-26_v0.8.txt) |
| 22/10/2026 | v0.7 | `37f115f` | Ubuntu 24.04.5 LTS · Node 22.17.1 · Google Chrome 155.0.8059.79 (headless) | **181 conferências, 0 falhas**, nenhum erro no console | [`2026-10-22_v0.7.txt`](resultados/2026-10-22_v0.7.txt) |

## 26/10/2026 — v0.8

Sobre o código da *tag* `v0.8` (`9bbf780`), rodado no próprio `main` da *tag*. A
única suíte que mudou é a `02-declarar`, com a seção 5b: excluir a declaração no dia
em que foi declarada (12.4 revista, #29), achado da prova de uso (#20).

| Suíte | O que cobre | Conferências | Falhas |
|---|---|---|---|
| `01-entrada` | oficializar, entrar, cadastro e papéis, dois administradores, arquivos ilegíveis, Ajuda (aviso LGPD), Sobre, cache | 45 | 0 |
| `02-declarar` | recusas do formulário, total ao vivo, colisão, substituir, encerrar, excluir, **engano do dia**, grade da semana | 43 | 0 |
| `03-painel` | indicadores, atribuição pelo dono do arquivo, filtros, recorte do leitor, CSV | 31 | 0 |
| `04-graficos` | cobertura, horas por semana, linha do tempo, dica no foco | 22 | 0 |
| `05-ausencias` | sem jornada, ausências na tela e no painel | 29 | 0 |
| `06-contrato` | chaves gravadas contra a tabela 5.6, chaves desconhecidas, formato mais novo | 19 | 0 |
| **Total** | | **189** | **0** |

Código de saída 0. Comando: `node testes/rodar.mjs > testes/resultado-testes.txt 2>&1`,
depois movido para `testes/resultados/`.

## 22/10/2026 — v0.7 (primeiro registro)

Primeira execução registrada, sobre o código da *tag* `v0.7` (`37f115f`). Rodou a
partir da branch `docs/prova-de-uso`, que só difere da `v0.7` na `code/LEIA-ME.txt`,
arquivo que o programa não carrega: programa e testes são os da *tag*.

| Suíte | O que cobre | Conferências | Falhas |
|---|---|---|---|
| `01-entrada` | oficializar, entrar, cadastro e papéis, dois administradores, arquivos ilegíveis, Ajuda (aviso LGPD), Sobre, cache | 45 | 0 |
| `02-declarar` | recusas do formulário, total ao vivo, colisão, substituir, encerrar, excluir, grade da semana | 35 | 0 |
| `03-painel` | indicadores, atribuição pelo dono do arquivo, filtros, recorte do leitor, CSV | 31 | 0 |
| `04-graficos` | cobertura, horas por semana, linha do tempo, dica no foco | 22 | 0 |
| `05-ausencias` | sem jornada, ausências na tela e no painel | 29 | 0 |
| `06-contrato` | chaves gravadas contra a tabela 5.6, chaves desconhecidas, formato mais novo | 19 | 0 |
| **Total** | | **181** | **0** |

Código de saída 0. Comando: `node testes/rodar.mjs > testes/resultado-testes.txt 2>&1`,
depois movido para `testes/resultados/`.

Antes deste registro, cada versão (v0.1 a v0.7) foi conferida pelas mesmas suítes
durante o desenvolvimento, mas os resultados não foram guardados.

## Como registrar uma versão nova

1. Com a *tag* criada, rode na raiz do repositório, sobre o código da *tag*:
   `node testes/rodar.mjs > testes/resultado-testes.txt 2>&1; echo $?`
2. Mova a saída para `testes/resultados/<aaaa-mm-dd>_<versão>.txt`.
3. Acrescente uma linha à tabela "Execuções" (data, versão, commit da *tag*,
   `node -v`, versão do navegador, total de conferências e falhas).
4. Se algo falhou, a versão não deveria ter sido marcada: registre mesmo assim, com o
   motivo, e corrija numa versão seguinte.

A saída só tem o elenco inventado; confira antes de versionar que nenhum caminho
real ou nome de verdade entrou nela.

/* =========================================================
   RODAR — executa as suítes de teste no navegador.

     node testes/rodar.mjs              todas as suítes
     node testes/rodar.mjs 02 05        só as que começam com 02 e 05

   Variáveis opcionais:
     CHROME=/caminho/do/chrome   navegador a usar (Chrome ou Edge)
     FOTOS=/uma/pasta            guarda capturas de tela para conferir o
                                 layout a olho; não fazem o teste passar
                                 nem falhar

   Precisa de Node 22 ou mais novo (WebSocket e fetch nativos) e de um
   Chrome ou Edge instalado. Nada de npm.

   Uma suíte falha se alguma conferência falhar OU se aparecer qualquer
   erro no console da página: erro silencioso também é defeito.
   ========================================================= */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrirNavegador } from "./navegador.mjs";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const filtros = process.argv.slice(2);
const suites = readdirSync(DIR).filter(f => /^\d\d-.*\.mjs$/.test(f)).sort()
  .filter(f => !filtros.length || filtros.some(p => f.startsWith(p)));
if (!suites.length) { console.error("Nenhuma suíte encontrada."); process.exit(2); }

const resumo = [];
for (const arq of suites) {
  const mod = await import(new URL(arq, import.meta.url));
  console.log(`\n=== ${arq} — ${mod.nome}`);
  let t;
  try {
    t = await abrirNavegador(mod.opcoes || {});
    await t.abrir();
    await mod.default(t);
  } catch (e) {
    if (t) t.confere(false, "ERRO no teste: " + e.message);
    else { console.log("  FALHA ERRO ao abrir o navegador: " + e.message); t = { oks: 0, falhas: 1, erros: [] }; }
  } finally {
    if (t?.erros.length) {
      console.log("  FALHA erros no console da página:\n    " + t.erros.join("\n    "));
      t.falhas++;
    }
    await t?.fechar?.();
  }
  resumo.push({ arq, oks: t.oks, falhas: t.falhas });
}

console.log("\n=== Resumo");
for (const r of resumo)
  console.log(`  ${r.falhas ? "FALHOU" : "ok    "}  ${r.arq}: ${r.oks} conferência(s), ${r.falhas} falha(s)`);
const total = resumo.reduce((s, r) => s + r.falhas, 0);
console.log(total ? `\n${total} falha(s).` : "\nTudo certo.");
process.exit(total ? 1 : 0);

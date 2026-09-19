#!/usr/bin/env node
/**
 * Mete en `disenio/contratos.json` un contrato `rediseno` por cada ruta de blog propia.
 *
 *     node scripts/sync-contratos-blog.mjs              SECO: dice que haria
 *     node scripts/sync-contratos-blog.mjs --escribir   lo escribe
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE HACE FALTA, Y POR QUE ES LA DECLARACION QUE MAS DUELE OLVIDAR
 *
 * `check:visual` trata toda ruta como `paridad` salvo que figure en `contratos.json` con
 * contrato `rediseno`. Y una ruta `paridad` SIN referencia **se salta EN SILENCIO**:
 *
 *     } else saltadas++;        // check-visual.mjs — sin console.log, sin tocar el exit code
 *
 * O sea que un articulo nuevo sin contrato no sale rojo: sale INVISIBLE. Es el fallo numero 1
 * del Programa R, el que cerro `PROMPT-REDISENO §2.1`, y con 90 articulos por delante es la
 * diferencia entre medir 90 paginas y creer que se miden.
 *
 * Los tres campos son OBLIGATORIOS (`scripts/lib/contratos.mjs`): sin `fecha`, `sha` o `motivo`
 * la puerta ABORTA ENTERA, no degrada esa ruta. Fallar cerrado, que es lo correcto.
 *
 * EL `sha` ES EL DE HEAD Y SE LEE DE GIT, no se inventa: es lo que permite decir despues contra
 * que codigo se aprobo esa captura. El arbol tiene que estar limpio, por lo mismo que lo exige
 * `aprobar-diseno.mjs`: una referencia aprobada tiene que poder atribuirse a un commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CONTRATOS = path.join(RAIZ, 'disenio/contratos.json');
const RUTAS = path.join(RAIZ, 'src/data/blogs-rutas.json');
const ESCRIBIR = process.argv.includes('--escribir');

if (!fs.existsSync(RUTAS)) {
  console.error('\n  ROJO no existe src/data/blogs-rutas.json. Corre build-blogs-rutas.mjs.\n');
  process.exit(1);
}
const { rutas } = JSON.parse(fs.readFileSync(RUTAS, 'utf8'));
const contratos = JSON.parse(fs.readFileSync(CONTRATOS, 'utf8'));

const sucio = execFileSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\n').filter((l) => l.trim() && !l.includes('_source/sanity-masters')).join('\n');
const SHA = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
const FECHA = execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: RAIZ, encoding: 'utf8' }).trim();

const faltan = Object.keys(rutas).filter((r) => !contratos.rutas[r]);
const sobran = Object.keys(contratos.rutas)
  .filter((r) => r.startsWith('/blogs/') && !rutas[r] && !contratos.rutas[r].motivo.includes('R9-BLOG'))
  .filter((r) => !fs.existsSync(path.join(RAIZ, 'baseline/text', `blogs_${r.replace('/blogs/', '')}.txt`)));

console.log(`\n  rutas de blog propias: ${Object.keys(rutas).length}`);
console.log(`  sin contrato: ${faltan.length}${faltan.length ? ` -> ${faltan.slice(0, 4).join(', ')}${faltan.length > 4 ? ' …' : ''}` : ''}`);
if (sobran.length) console.log(`  contratos de rutas que ya no existen: ${sobran.join(', ')}`);

if (!faltan.length && !sobran.length) { console.log('\n  ok   contratos.json al dia\n'); process.exit(0); }

if (sucio && ESCRIBIR) {
  console.error('\n  ROJO el arbol de git no esta limpio. El `sha` de un contrato tiene que poder');
  console.error('       atribuirse a un commit. Commitea primero.\n');
  console.error(sucio.split('\n').slice(0, 10).map((l) => `   ${l}`).join('\n'), '\n');
  process.exit(1);
}

for (const r of faltan) {
  contratos.rutas[r] = {
    contrato: 'rediseno',
    fecha: FECHA,
    sha: SHA,
    motivo: rutas[r].motivo + ' Ruta NUEVA: no hay captura de Webflow contra la que comparar, '
      + 'asi que su referencia se aprueba con scripts/aprobar-diseno.mjs.',
  };
}
for (const r of sobran) delete contratos.rutas[r];

if (!ESCRIBIR) {
  console.log(`\n  SECO: se anadirian ${faltan.length} y se quitarian ${sobran.length}.`);
  console.log(`        fecha ${FECHA} · sha ${SHA}`);
  console.log('        --escribir para aplicarlo\n');
  process.exit(0);
}

fs.writeFileSync(CONTRATOS, JSON.stringify(contratos, null, 1) + '\n');
console.log(`\n  OK ${faltan.length} contrato(s) anadido(s), ${sobran.length} quitado(s)`);
console.log(`     fecha ${FECHA} · sha ${SHA}`);
console.log(`     total en contratos.json: ${Object.keys(contratos.rutas).length}\n`);

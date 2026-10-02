/** Cierra una unidad del loop: mide alto antes, aplica decisiones, paginas+build, mide alto despues,
 *  puertas acotadas, hoja de revision, estado, bitacora y commit por nombre.
 *     node scripts/loop-cerrar.mjs <unidad> "<titulo del commit>" */
import fs from 'node:fs'; import path from 'node:path'; import { execSync, execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [unidad, titulo] = process.argv.slice(2);
const sh = (c, ok = false) => { try { return execSync(c, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { if (ok) return (e.stdout ?? '') + (e.stderr ?? ''); throw e; } };
const E = path.join(RAIZ, 'docs/encargos/LOOP-IMAGENES-ESTADO.json');
const estado = () => JSON.parse(fs.readFileSync(E, 'utf8'));
const u = estado().unidades.find((x) => x.id === unidad); const ruta = u.ruta; const slug = ruta.split('/').pop();
const dec = JSON.parse(fs.readFileSync(path.join(RAIZ, 'banco/.trabajo/loop-imagenes', unidad, 'decisiones.json'), 'utf8'));

// 1 alto antes (misma receta que despues)
const medir = () => JSON.parse(execFileSync('node', [path.join(RAIZ, 'scripts/loop-alto.mjs'), ruta], { encoding: 'utf8' }));
const antes = medir();
// 2 aplicar
console.log(sh(`node scripts/loop-aplicar.mjs ${unidad}`));
// 3 check-seo: about.image sigue al heroe
const heroe = dec.huecos.find((h) => h.hueco === 'heroe');
if (heroe?.estado === 'canjeada') {
  const cap = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8'))[ruta];
  const f = path.join(RAIZ, 'scripts/check-seo.mjs'); let s = fs.readFileSync(f, 'utf8');
  if (!s.includes(`'${heroe.antes}'`)) throw new Error('check-seo: no encuentro la tupla about.image de ' + heroe.antes);
  s = s.replace(`'${heroe.antes}'`, `'${cap.heroe.foto}'`); fs.writeFileSync(f, s);
}
// 4 paginas + build
sh('npm run paginas', true); sh('npm run build'); sh('git checkout -- public/robots.txt public/sitemap.xml public/llms.txt');
const despues = medir();
const delta = Object.keys(antes).map((w) => `${w}:${despues[w] - antes[w] >= 0 ? '+' : ''}${despues[w] - antes[w]}`).join(' ');
// 5 puertas
const res = {};
const puerta = (n, c) => { const o = sh(c, true); res[n] = /ROJO/.test(o) && !/PUERTA VERDE/.test(o) ? 'ROJA' : 'verde'; return o; };
puerta('check:tokens', 'npm run check:tokens'); puerta('check:estructura', 'npm run check:estructura'); puerta('check:assets', 'npm run check:assets');
puerta('check:seo', 'npm run check:seo'); puerta('build-banco --check', 'node scripts/build-banco.mjs --check');
puerta('check:galeria (ficha)', `npm run check:galeria -- ${ruta}`); puerta('check-texto (ficha)', `node scripts/check-texto.mjs ${slug}`);
const vis = sh(`node scripts/check-visual.mjs ${slug}`, true); res['check-visual'] = /PUERTA VERDE/.test(vis) ? 'verde' : 'ROJA (referencia anterior al rediseño; alto antes/despues ' + delta + ')';
const rojas = Object.entries(res).filter(([k, v]) => v.startsWith('ROJA') && k !== 'check-visual');
// 6 estado -> hecha, puerta del loop
{ const e = estado(); const uu = e.unidades.find((x) => x.id === unidad); uu.estado = rojas.length ? 'frenada' : 'hecha'; uu.commit = 'siguiente-iteracion';
  uu.puertas = res; uu.alto_antes_despues = delta; if (rojas.length) uu.motivo_freno = rojas.map(([k]) => k).join(', ');
  fs.writeFileSync(E, JSON.stringify(e, null, 2) + '\n'); }
const fotos = sh(`node scripts/check-fotos-servicios.mjs ${unidad}`, true); res['check-fotos-servicios'] = /VERDE/.test(fotos) ? 'verde' : 'ROJA';
if (rojas.length || res['check-fotos-servicios'] === 'ROJA') { console.error('FRENO: puerta roja', JSON.stringify(res), fotos.slice(-800)); process.exit(1); }
// 7 hoja
sh(`node scripts/loop-hoja.mjs ${unidad}`, true);
// 8 bitacora
const n = (s) => dec.huecos.filter((h) => h.estado === s).length;
const canj = dec.huecos.filter((h) => h.estado === 'canjeada').map((h) => `${h.hueco} ${h._banco}`).join(', ');
const L = path.join(RAIZ, 'MIGRACION-LOG.md'); let log = fs.readFileSync(L, 'utf8'); const marca = '## LOOP-IMAGENES';
const entrada = `## LOOP-IMAGENES · ${unidad} — ${titulo} (2-oct-2026)\n\n${dec.huecos.length} huecos; juez a ciegas. **${n('canjeada')} canjes**: ${canj || 'ninguno'}. ${n('se-queda')} se quedan (motivo y foto que falta en el estado). Alto de la página antes/después, misma receta: ${delta}.\n\n### Puertas\n\n${Object.entries(res).map(([k, v]) => `${k}: ${v}`).join(' · ')}.\n\n`;
fs.writeFileSync(L, log.replace(marca, entrada + marca));
// 9 commit por nombre
const nuevos = sh('git status --short public/images/obra scripts src docs MIGRACION-LOG.md').split('\n').filter(Boolean).map((l) => l.slice(3)).filter((f) => !f.includes('sanity-masters'));
execFileSync('git', ['add', '--', ...nuevos], { cwd: RAIZ });
fs.writeFileSync('/tmp/claude-501/loop-commit.txt', `${titulo}\n\nLoop de imagenes, unidad ${unidad}: ${n('canjeada')} canjes de ${dec.huecos.length} huecos, juez a ciegas.\nAlto de la pagina antes/despues: ${delta}.\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n`);
sh('git commit -q -F /tmp/claude-501/loop-commit.txt');
const hash = sh('git rev-parse --short HEAD').trim();
{ const e = estado(); e.unidades.find((x) => x.id === unidad).commit = hash; fs.writeFileSync(E, JSON.stringify(e, null, 2) + '\n'); sh('git add docs/encargos/LOOP-IMAGENES-ESTADO.json && git commit -q --amend --no-edit'); }
console.log(`${unidad} HECHA ${sh('git rev-parse --short HEAD').trim()} · ${n('canjeada')}/${dec.huecos.length} canjes · alto ${delta} · ${Object.entries(res).map(([k, v]) => k + ':' + v.split(' ')[0]).join(' ')}`);

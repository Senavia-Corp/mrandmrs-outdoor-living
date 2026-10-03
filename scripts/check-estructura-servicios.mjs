#!/usr/bin/env node
/**
 * PUERTA de estructura — las 14 fichas de `/services/` con LAS MISMAS secciones y en EL MISMO orden.
 *
 *     npm run check:estructura
 *
 * NACE DE UNA DESVIACION QUE NINGUNA PUERTA VEIA. Hasta el 13-sep-2026 la ficha de piscina
 * cambiaba `gallery` por `CarruselProyectos` y las otras trece no: dos estructuras, y verde en
 * todo. `check:texto` compara texto contra el origen de CADA ficha, asi que una ficha distinta de
 * sus hermanas no le parece rara. Esta puerta compara las catorce entre ellas y contra el orden
 * que decidio Sebastian: desde el 21-sep-2026, la GALERIA justo debajo del formulario y las
 * RESENAS detras de la FAQ, delante de «Where We Serve» — las dos bandas azules canjeadas.
 *
 * Estatica, sin navegador, <1 s. Sobre `.vercel/output/static`, como las demas.
 *
 * QUE CUENTA COMO SECCION: las `<section>` sin otra `<section>` por encima -`ResenasGoogle` y el
 * feed cuelgan de la suya- y por su PRIMERA clase. Se corta del heroe al pie, porque el cromo
 * (`code`, `menu`, `footer`) no es de la ficha.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { esFicha } from './lib/renombradas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');

/** El orden de Sebastian (13-sep-2026; galeria y resenas canjeadas el 21-sep-2026). Escrito aqui
 *  a mano a proposito: derivarlo del generador que lo produce seria comparar la salida consigo
 *  misma. */
const ESPERADO = [
  'hero-services', 'logos-section', 'svc-confianza', 'trusted-section', 'appointment-section',
  'gallery', 'services', 'process-section', 'svc-inversion', 'faq-section', 'testimonial-section',
  'location', 'blog-section-page', 'social-media', 'cta-footer', 'logos-section',
];

/** Excepciones declaradas: las dos fichas de piscina recuperan el antes/despues entre los servicios
 *  y el proceso. Remodelacion con el par real del banco (R24-FOTO-PISCINAS, 1-oct-2026); obra nueva
 *  con el par de la home (2-oct-2026). Escritas a mano por lo mismo que `ESPERADO`: si se
 *  derivasen de `antesDespues` en el JSON, la puerta daria por bueno cualquier sitio donde el
 *  generador la pusiera. */
const VARIANTES = {
  '/services/pool-remodeling': { tras: 'services', va: 'before-after-section' },
  '/services/pool-builders': { tras: 'services', va: 'before-after-section' },
};
const esperadoDe = (ruta) => {
  const v = VARIANTES[ruta];
  if (!v) return ESPERADO;
  const i = ESPERADO.indexOf(v.tras);
  return [...ESPERADO.slice(0, i + 1), v.va, ...ESPERADO.slice(i + 1)];
};

const RUTAS = Object.keys(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8')))
  .filter(esFicha);   // las 14 fichas, no el silo /services/pool-builders/<x>

const leer = (ruta) => {
  for (const p of [path.join(ESTATICO, ruta, 'index.html'), path.join(ESTATICO, `${ruta}.html`)]) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};

let fallos = 0;
const mal = (r, m) => { fallos++; console.log(`  ROJO ${r}\n       ${m}`); };

console.log('\n── estructura de las fichas de /services/ ──');
if (RUTAS.length !== 14) mal('captacion-servicios.json', `declara ${RUTAS.length} fichas de /services/ y son 14`);

for (const ruta of RUTAS) {
  const html = leer(ruta);
  if (!html) { mal(ruta, 'no se construyo'); continue; }
  const d = new JSDOM(html).window.document;
  const clases = [...d.querySelectorAll('section')]
    .filter((s) => !s.parentElement?.closest('section'))
    .map((s) => s.classList[0]);
  const cuerpo = clases.slice(clases.indexOf('hero-services'), clases.lastIndexOf('footer'));
  const esperado = esperadoDe(ruta);
  if (cuerpo.join(' ') !== esperado.join(' ')) {
    const i = esperado.findIndex((c, k) => cuerpo[k] !== c);
    mal(ruta, `puesto ${i + 1}: se esperaba «${esperado[i] ?? '(nada)'}» y hay «${cuerpo[i] ?? '(nada)'}»\n`
      + `       orden: ${cuerpo.join(' · ')}`);
    continue;
  }
  const slides = d.querySelectorAll('section.gallery [fs-slider-element="slide"]').length;
  if (!slides) { mal(ruta, 'la gallery esta pero sin slides'); continue; }
  console.log(`  ok   ${ruta}   (${slides} slides en la galeria)${VARIANTES[ruta] ? `   + ${VARIANTES[ruta].va} tras ${VARIANTES[ruta].tras} (declarada)` : ''}`);
}

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : `PUERTA VERDE — ${RUTAS.length} fichas, un solo orden (+ ${Object.keys(VARIANTES).length} variante(s) declarada(s))`}\n`);
process.exit(fallos ? 1 : 0);

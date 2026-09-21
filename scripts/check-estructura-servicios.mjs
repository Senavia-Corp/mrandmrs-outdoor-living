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

const RUTAS = Object.keys(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8')))
  .filter((k) => k.startsWith('/services/'));

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
  if (cuerpo.join(' ') !== ESPERADO.join(' ')) {
    const i = ESPERADO.findIndex((c, k) => cuerpo[k] !== c);
    mal(ruta, `puesto ${i + 1}: se esperaba «${ESPERADO[i] ?? '(nada)'}» y hay «${cuerpo[i] ?? '(nada)'}»\n`
      + `       orden: ${cuerpo.join(' · ')}`);
    continue;
  }
  const slides = d.querySelectorAll('section.gallery [fs-slider-element="slide"]').length;
  if (!slides) { mal(ruta, 'la gallery esta pero sin slides'); continue; }
  console.log(`  ok   ${ruta}   (${slides} slides en la galeria)`);
}

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : `PUERTA VERDE — ${RUTAS.length} fichas, un solo orden`}\n`);
process.exit(fallos ? 1 : 0);

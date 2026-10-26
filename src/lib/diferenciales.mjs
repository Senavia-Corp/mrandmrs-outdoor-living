/**
 * TABLA DE DIFERENCIALES de la home (TABLA-DIFERENCIALES, 17-oct-2026): lo que un proyecto
 * necesita, de la visita a la propiedad al cierre, y quien lo cubre en cada forma de hacerlo.
 *
 * FUENTE UNICA: la pinta `TablaDiferenciales.astro` y la declara `check-texto.mjs` desde las
 * MISMAS filas, asi que una fila nueva o una errata mueven las dos a la vez (D-10).
 *
 * Cada afirmacion sobre Mr & Mrs sale de lo que el sitio YA dice; la referencia va al lado.
 * Sobre las dos alternativas no se afirma nada que no sea estructural (un oficio cubre su
 * oficio; con varios proveedores coordina el cliente). Sin cifras, plazos ni garantias
 * (decision de Sebastian, 2-sep-2026).
 */
import fs from 'node:fs';
import path from 'node:path';

// `process.cwd()` y no `import.meta.url`, como `galeria-categorias.mjs`: dentro del build de Astro
// este modulo viaja en un chunk y su URL ya no cuelga de `src/lib`.
const SERVICIOS = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/data/servicios-categoria.json'), 'utf8'))['/'].servicios;

export const COLUMNAS = {
  necesidad: 'What your project needs',
  mm: 'Mr & Mrs Outdoor Living',
  oficio: 'Single-trade contractor',
  varios: 'Multiple vendors or DIY',
};

/** Celdas: `true` = Included (check), `false` = Not included (aspa), texto = lo que cubre. */
export const SI = true;
export const NO = false;
export const SU_OFICIO = 'Their trade only';
export const TU_COORDINAS = 'You coordinate';
export const VARIA = 'Varies';

export const GRUPOS = [
  {
    titulo: 'How the project runs',
    filas: [
      // «We walk your property…» (/financing, /request-estimated); «Get a Free Estimate» (home).
      { necesidad: 'Property walk and free estimate', mm: SI, oficio: SU_OFICIO, varios: 'Per vendor' },
      // «3D Design» (sellos del hero) y «3D Pool Design & Visualization» (home).
      { necesidad: '3D design of the whole space', mm: SI, oficio: SU_OFICIO, varios: NO },
      // «We pull the … permits under our own license» (/services/outdoor-kitchens); licencias en identidad.mjs.
      { necesidad: 'Permits pulled under a licensed contractor', mm: SI, oficio: SU_OFICIO, varios: TU_COORDINAS },
      // «Licensed & Engineered» (home); «Engineering, permits, and the build itself» (/financing).
      { necesidad: 'Engineering', mm: SI, oficio: SU_OFICIO, varios: TU_COORDINAS },
      // «One team handles design, permits, engineering, and construction» (home).
      { necesidad: 'One team from design to construction', mm: SI, oficio: NO, varios: NO },
      // «By managing materials, scheduling, and crews internally…» (/about).
      { necesidad: 'Materials, scheduling and crews managed in-house', mm: SI, oficio: SU_OFICIO, varios: TU_COORDINAS },
      // «Financing Available» (hero); «options through our lending partner» (/financing).
      { necesidad: 'Financing options through a lending partner', mm: SI, oficio: VARIA, varios: VARIA },
    ],
  },
  {
    titulo: 'What gets designed and built',
    // Los 14 servicios con ficha en /services, en el orden del indice de la home.
    filas: SERVICIOS.map((s) => ({ necesidad: s.nombre.replace(/\s+/g, ' ').trim(), mm: SI })),
    // En este bloque las alternativas no van fila a fila: una sola celda por columna (rowspan).
    oficio: 'One trade per contractor',
    varios: 'One vendor per trade, coordinated by you',
  },
];

export const TITULO = 'Everything Your Project Needs, One Team';
export const PARRAFO = 'Compare what a single-trade contractor or a set of separate vendors covers with what our licensed design-build team handles for you, from the first property walk to the finished build.';
export const RESUMEN = 'Scope of a project with Mr & Mrs Outdoor Living compared with a single-trade contractor and with multiple vendors or DIY';
export const NOTA = 'Financing is offered through a third-party lending partner; approval and terms come from the lender.';
export const INCLUIDO = 'Included';
export const NO_INCLUIDO = 'Not included';

/**
 * Las lineas que la seccion deja en `innerText` (Chromium: una tabla sale fila por linea, con las
 * celdas separadas por tabulador, que la puerta colapsa a un espacio; un check es un `<svg>` con
 * `aria-label`, sin texto). Es lo que `check-texto.mjs` descuenta en la home.
 */
export function lineasDiferenciales() {
  const celda = (v) => (typeof v === 'string' ? v : '');
  const fila = (...vs) => vs.map(celda).filter(Boolean).join(' ');
  const out = [TITULO, PARRAFO, RESUMEN, fila(COLUMNAS.necesidad, COLUMNAS.mm, COLUMNAS.oficio, COLUMNAS.varios)];
  for (const g of GRUPOS) {
    out.push(g.titulo);
    g.filas.forEach((f, i) => out.push(fila(f.necesidad, f.mm, i === 0 ? g.oficio ?? f.oficio : f.oficio, i === 0 ? g.varios ?? f.varios : f.varios)));
  }
  out.push(NOTA);
  return out;
}

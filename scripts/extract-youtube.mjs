#!/usr/bin/env node
/**
 * Extrae los datos REALES de la galería de YouTube de `/videos` y baja sus miniaturas.
 *
 *     npm run youtube
 *
 * POR QUÉ EXISTE
 * `/videos` lleva un CUARTO widget de Elfsight que `PROMPT.md` no conocía: una **YouTube
 * Gallery** (`2dd65b70-...`). Y a diferencia de los otros tres, **este sí pinta**: 45 kB de
 * contenido real, con la cabecera del canal y 8 vídeos con título, fecha, duración,
 * descripción completa y contadores. Sin él, `check:texto` pierde 114 líneas de esa página.
 *
 * DE DÓNDE SALEN LOS DATOS
 * De `baseline/html/videos.html`, que es el DOM del sitio VIVO después de que el widget
 * pintara. O sea: datos reales del canal del cliente, capturados del propio sitio. No hay
 * nada inventado y no hace falta ninguna clave de API.
 *
 * Las miniaturas se bajan a `public/images/site/youtube/`: las de `i.ytimg.com` y el avatar
 * de `yt3.ggpht.com` son de terceros y el encargo pide cero dependencias externas.
 *
 * Cuando el cliente suba un vídeo nuevo, esto habrá que volver a correrlo — pero solo
 * mientras el sitio viejo siga en pie. Después, la integración de la Fase 8 con la API de
 * YouTube. Queda anotado en la bitácora.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DEST_IMG = path.join(RAIZ, 'public/images/site/youtube');
const ORIGEN = path.join(RAIZ, 'baseline/html/videos.html');

const doc = new JSDOM(fs.readFileSync(ORIGEN, 'utf8')).window.document;
const g = doc.querySelector('#yottie-1');
if (!g) { console.error('\nROJO no encuentro la galeria en baseline/html/videos.html\n'); process.exit(1); }

fs.mkdirSync(DEST_IMG, { recursive: true });
const bajadas = [];
async function bajar(url, nombre) {
  const destino = path.join(DEST_IMG, nombre);
  if (fs.existsSync(destino)) return `/images/site/youtube/${nombre}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} bajando ${url}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  bajadas.push(nombre);
  return `/images/site/youtube/${nombre}`;
}

const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');

const canal = {
  titulo: txt(g.querySelector('.yottie-widget-header-channel-title')),
  propiedades: [...g.querySelectorAll('.yottie-widget-header-channel-properties-item-text')].map(txt),
  enlace: g.querySelector('.yottie-widget-header-channel-title')?.closest('a')?.href
    ?? 'https://www.youtube.com/channel/UC3VGkVUUC1FmXhtn2CUofsA',
};
const logo = g.querySelector('.yottie-widget-header-logo img');
if (logo?.src) canal.logo = await bajar(logo.src, 'canal.jpg');

const videos = [];
for (const v of g.querySelectorAll('.yottie-widget-video')) {
  const id = v.getAttribute('data-yt-id');
  const img = v.querySelector('.yottie-widget-video-preview-thumbnail img');
  const info = v.querySelector('.yottie-widget-video-info');
  // La descripción es el bloque de info menos el título, la fecha y los contadores: se coge
  // el innerText del propio nodo de descripción para conservar sus saltos de línea tal cual.
  const desc = v.querySelector('.yottie-widget-video-info-caption');
  videos.push({
    id,
    titulo: txt(v.querySelector('.yottie-widget-video-info-title')),
    duracion: txt(v.querySelector('.yottie-widget-video-preview-marker-duration')),
    fecha: txt(v.querySelector('.yottie-widget-video-info-passed-time')),
    // Se pasa por el DOM en vez de recortar etiquetas a mano: `replace(/<[^>]+>/g,'')` deja
    // las entidades sin decodificar y la descripcion salia con "&amp" dentro.
    descripcion: desc ? (() => {
      const tmp = doc.createElement('div');
      tmp.innerHTML = desc.innerHTML.replace(/<br\s*\/?>/gi, '\n');
      return tmp.textContent.split('\n').map((x) => x.trim()).filter(Boolean);
    })() : [],
    // El divisor `•` vive DENTRO de cada item, así que hay que leer el <span> hermano,
    // no el item entero: si no, cada contador sale como "• 1 Views".
    contadores: [...v.querySelectorAll('.yottie-widget-video-info-properties-item')]
      .map((it) => txt([...it.children].find((c) => !c.className.includes('divider')) ?? it))
      .filter(Boolean),
    enlace: `https://www.youtube.com/watch?v=${id}`,
    miniatura: img ? await bajar(img.getAttribute('data-maxres-src') ?? img.src, `${id}.jpg`) : null,
  });
}

const salida = {
  _lee_esto: 'DERIVADO de baseline/html/videos.html, el DOM del sitio vivo tras pintar el widget '
    + 'de Elfsight. Datos reales del canal del cliente. Regenerar: npm run youtube',
  canal, videos,
};
fs.writeFileSync(path.join(RAIZ, 'src/data/youtube.json'), JSON.stringify(salida, null, 1));
console.log(`\n  canal      : ${canal.titulo} — ${canal.propiedades.join(' / ')}`);
console.log(`  videos     : ${videos.length}`);
console.log(`  miniaturas : ${bajadas.length} nuevas en public/images/site/youtube/`);
console.log(`  sin descripcion: ${videos.filter((v) => !v.descripcion.length).length}`);
console.log('\n  OK src/data/youtube.json\n');

// Extrae el payload de interacciones (IX2) del webflow.js exportado y genera:
//   _source/animations/ix2.json        payload crudo
//   _source/animations/ix2-catalog.md  catálogo legible de las animaciones
//   _source/animations/ix2-targets.csv data-w-id -> animación -> breakpoints -> páginas
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPORT = path.join(ROOT, '_source/webflow-export');
const OUT = path.join(ROOT, '_source/animations');

// --- 1. extraer el literal balanceado de Webflow.require("ix2").init({...})
const js = fs.readFileSync(path.join(EXPORT, 'js/webflow.js'), 'utf8');
const i = js.indexOf('Webflow.require("ix2").init(');
if (i < 0) throw new Error('no se encontró el bloque ix2 en webflow.js');
const start = js.indexOf('{', i);
let depth = 0, end = start;
for (let k = start; k < js.length; k++) {
  if (js[k] === '{') depth++;
  else if (js[k] === '}' && --depth === 0) { end = k + 1; break; }
}
const data = eval('(' + js.slice(start, end) + ')'); // literal de datos, sin llamadas
fs.writeFileSync(path.join(OUT, 'ix2.json'), JSON.stringify(data, null, 2));

const events = Object.values(data.events || {});
const lists = data.actionLists || {};
const mq = data.site?.mediaQueries || [];

// --- 2. en qué página vive cada data-w-id
const pages = fs.readdirSync(EXPORT).filter(f => f.endsWith('.html'));
const wid2pages = {};
for (const p of pages) {
  const html = fs.readFileSync(path.join(EXPORT, p), 'utf8');
  for (const m of html.matchAll(/data-w-id="([^"]+)"/g)) {
    (wid2pages[m[1]] ??= new Set()).add(p);
  }
}
// elementos que el <style> inline del <head> arranca en opacity:0
const guarded = new Set();
for (const p of pages) {
  const html = fs.readFileSync(path.join(EXPORT, p), 'utf8');
  for (const m of html.matchAll(/\[data-w-id="([^"]+)"\]\s*\{opacity:0;\}/g)) guarded.add(m[1]);
}

// --- 3. resumen por actionList
const EASINGS = {
  outQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOut: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
};
const usage = {};
for (const e of events) {
  const id = e.action?.config?.actionListId;
  if (!id) continue;
  (usage[id] ??= []).push(e);
}

let md = `# Catálogo de interacciones (IX2) — Mr & Mrs Outdoor Living

Generado por \`scripts/extract-ix2.mjs\` desde \`_source/webflow-export/js/webflow.js\`.
**No editar a mano.** Payload crudo en \`ix2.json\`.

- **${events.length} eventos** sobre **${Object.keys(wid2pages).length} elementos únicos** (\`data-w-id\`)
- **${Object.keys(lists).length} listas de acción**
- **${guarded.size} elementos arrancan en \`opacity:0\`** desde el \`<style>\` inline del \`<head>\`:
  si no reimplementas su animación, quedan invisibles para siempre.

## Breakpoints de Webflow (aplican a las mediaQueries de cada evento)

| key | min | max |
|---|---|---|
${mq.map(m => `| \`${m.key}\` | ${m.min} | ${m.max === 10000 ? '∞' : m.max} |`).join('\n')}

## Equivalencias de easing

| Webflow | CSS |
|---|---|
${Object.entries(EASINGS).map(([k, v]) => `| \`${k}\` | \`${v}\` |`).join('\n')}

---

`;

for (const [id, list] of Object.entries(lists)) {
  const users = usage[id] || [];
  const byType = {}, byMq = {};
  for (const e of users) {
    byType[e.eventTypeId] = (byType[e.eventTypeId] || 0) + 1;
    const k = (e.mediaQueries || []).slice().sort().join('+');
    byMq[k] = (byMq[k] || 0) + 1;
  }
  md += `## \`${id}\`${list.title ? ` — ${list.title}` : ''}\n\n`;
  md += `- **${users.length} eventos**: ${Object.entries(byType).map(([k, v]) => `\`${k}\` ×${v}`).join(', ') || '—'}\n`;
  md += `- **breakpoints**: ${Object.entries(byMq).map(([k, v]) => `\`${k || 'todos'}\` ×${v}`).join(', ') || '—'}\n\n`;
  md += `| paso | acción | delay | duración | easing | valores |\n|---|---|---|---|---|---|\n`;
  (list.actionItemGroups || []).forEach((g, gi) => {
    for (const a of g.actionItems) {
      const c = a.config || {};
      const vals = Object.entries(c)
        .filter(([k]) => !['target', 'delay', 'duration', 'easing'].includes(k))
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
      md += `| ${gi} | \`${a.actionTypeId}\` | ${c.delay ?? '—'} | ${c.duration ?? '—'} | ${c.easing ? `\`${c.easing}\`` : '—'} | ${vals || '—'} |\n`;
    }
  });
  md += '\n';
}
fs.writeFileSync(path.join(OUT, 'ix2-catalog.md'), md);

// --- 4. CSV de targets
const rows = [['dataWId', 'actionListId', 'eventTypeId', 'mediaQueries', 'arrancaEnOpacity0', 'paginas']];
for (const e of events) {
  // Webflow codifica los targets con ambito de pagina como `<pageId>|<data-w-id>`, pero el
  // atributo del HTML lleva SOLO el data-w-id. Sin pelar el prefijo, 41 de las 79 claves no
  // casaban con ningun elemento y esas entradas por scroll no se animaban nunca.
  const wid = e.target?.id?.split('|').pop();
  if (!wid) continue;
  rows.push([
    wid,
    e.action?.config?.actionListId || '',
    e.eventTypeId,
    (e.mediaQueries || []).join('|'),
    guarded.has(wid) ? 'SI' : 'no',
    [...(wid2pages[wid] || [])].sort().join('|'),
  ]);
}
fs.writeFileSync(
  path.join(OUT, 'ix2-targets.csv'),
  rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
);

console.log(`ix2.json           ${events.length} eventos, ${Object.keys(lists).length} listas`);
console.log(`ix2-catalog.md     ${md.split('\n').length} líneas`);
console.log(`ix2-targets.csv    ${rows.length - 1} filas`);
console.log(`elementos con opacity:0 de arranque: ${guarded.size}`);

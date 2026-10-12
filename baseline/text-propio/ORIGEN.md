# baseline/text-propio — referencia de texto de las rutas que nunca estuvieron en Webflow

- **Qué es:** el `innerText` normalizado de cada página construida que no figura en
  `_source/routes.csv`. 119 ficheros, uno por ruta, con el mismo nombre que da `aSlug()`.
- **De dónde sale:** build de `origin/main` en `27705f3` («Merge ORDEN-CIUDADES-2: Project
  Gallery sube, Pool Cost baja (#61)», 6-oct-2026), con `src/`, `public/` y `scripts/`
  idénticos a ese commit salvo el propio `scripts/check-texto.mjs`.
- **Cuándo y cómo:** 2026-10-12 00:58 EDT, con `node scripts/check-texto.mjs --capturar-propio`: la misma
  `asentar()` + `textoNormalizado()` y el mismo Chromium visible que usa la medición.
- **Qué NO es:** paridad con Webflow. Es «lo que hay hoy en producción». `baseline/text/` (las
  115 del origen) es otra cosa y no se toca.
- **Cómo se compara:** en crudo. Solo le aplica una declaración de `check-texto.mjs` que nombre
  la ruta en su `rutas`/`ruta`.
- **Cómo se cambia una referencia:** borrando el fichero a mano y volviendo a capturar. El modo
  de captura se niega a sobrescribir. Una ruta construida sin fichero aquí ni en
  `baseline/text/` es ROJO.

Familias: 65 `/services/<servicio>/<ciudad>`, 37 `/blogs/`, 10 `/gallery/`, 5 `/project/`,
`/financing`, `/thank-you`.

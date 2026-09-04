# Mr & Mrs Outdoor Living — reglas de la casa

Astro 5 estático con adaptador Vercel, réplica elevada de un Webflow. **115 rutas.** CSS propio,
sin React. Manda `PROMPT-REDISENO.md`; el reparto vivo está en `docs/encargos/DIRECTOR.md`, los
umbrales en `docs/encargos/CRITERIO.md`, y lo último hecho en `MIGRACION-LOG.md`.

## 1. No se barre el sitio

**No recorras las rutas para «ver cómo va».** Nada de `ui-qa`, `carrusel-qa` ni `0.8.0:audit`
por iniciativa propia, y nada de abrir el preview e ir pasando páginas. Una barrida son 115
rutas × varios anchos: ~65 min con la pantalla de Sebastian secuestrada, y ya se quejó por
escrito (`docs/encargos/DIRECTOR.md:30`).

**Pero si un encargo o Sebastian los piden por su nombre, se ejecutan sin preguntar y sin
objetar.** Ejemplo canónico y hoy vigente: `PROMPT-TRACKING.md:353` pide `ui-qa` +
`0.8.0:audit` sobre `/thank-you` a 4 anchos, porque es ruta nueva sin referencia en
`baseline/shots/` y las puertas se la saltan. Eso es uso legítimo. Lo que se corta es el
barrido que nadie pidió, no la auditoría que sí.

El panel del navegador se abre para mirar **una** ruta, se mira, y se cierra. No se deja
corriendo mientras piensas o escribes (`docs/encargos/PARTE-02.md:26`).

## 2. La verificación son las puertas, no el chat

Hay 15. Miden más y mejor que mirar capturas, headless y sin gastar contexto:

```bash
npm run check:tokens                       # estática, <1 s, córrela siempre
npm run check:rutas && npm run check:enlaces && npm run check:seo
node scripts/check-texto.mjs  <subcadena>  # acotada por ruta
node scripts/check-visual.mjs <subcadena>  # 35-60 s por ruta × 4 anchos
```

**Deriva las rutas afectadas antes de medir, no las adivines:**

```bash
grep -rlo 'class="mi-clase"' .vercel/output/static --include='*.html' | wc -l
```

Tres trampas que ya cazaron a alguien aquí:

- **Nunca pases `/` como filtro.** Casa por `includes()`: te lleva las 115 creyendo que mides
  4. Para la home hay coincidencia exacta, y **con comillas**, que zsh se come `=/` suelto:
  `node scripts/check-visual.mjs '=/'`.
- `check:ix2` y `check:cascaron` **no leen `argv`**: van solo en gate de fase.
- Verifica sobre `.vercel/output/static`, **nunca** sobre `astro dev` — dev no hornea
  `width`/`height` y las medidas mienten.

**Una puerta que no corrió no es una puerta verde.** Si se saltó por falta de referencia, dilo:
falla ABIERTO (`docs/encargos/DIRECTOR.md:149`). Es justo por eso que hay rutas que sí necesitan
auditoría a mano — ver §1.

## 3. Construir, commitear y desplegar no son gratis

`npm run build` sobrescribe `.vercel/output/static`, que es artefacto compartido: puede haber
otros chats sobre este mismo árbol a la vez. Los tres actos son del director
(`docs/encargos/DIRECTOR.md:35`). Si tu encargo te los autoriza, adelante; si no, entrega el
diff y para.

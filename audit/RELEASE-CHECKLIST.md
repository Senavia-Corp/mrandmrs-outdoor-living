# Checklist de entrega — Mr & Mrs Outdoor Living

Cierre de la auditoría integral del 4/5-sep-2026. Cada línea lleva **cómo** se comprobó.
Lo que no se pudo comprobar lo dice con su nombre y su motivo: una puerta que no corrió no es
una puerta verde.

## 1 · Código y build

| Punto | Cómo se comprobó | Estado |
|---|---|---|
| El build pasa desde cero | `PUBLIC_ES_PRODUCCION=1 npm run build` en worktree limpio, con `node_modules` recién enlazado | ✅ 20 s |
| El sustrato de medida es producción, no preview | Verificado: 122/122 con canónica, `robots.txt` abierto, sitemap con 121 `<loc>` | ✅ |
| Sin errores de consola | Sonda, 732 mediciones | ✅ 0 |
| Sin peticiones propias fallidas | Sonda, 732 mediciones | ✅ 0 |
| Sin imágenes rotas | Sonda, 732 mediciones | ✅ 0 |

## 2 · Las puertas del repositorio

| Puerta | Resultado |
|---|---|
| `check:tokens` `check:rutas` `check:enlaces` `check:seo` `check:medicion` `check:assets` `check:aviso` `check:estimador` | ✅ **las 8 verdes** sobre el build de release |
| `check:menu` `check:galeria` `check:galeria-formulario` `check:carrusel` | ✅ **las 4 verdes** (headless) |
| `check:visual` | 🔴 **roja en `/about`**, y está **medido que ya lo estaba antes**: la misma puerta sobre `33baf7e` da los mismos −17 px a 1920 y −29 px a 1440. Causa: `/about` sigue en contrato `paridad` estando rediseñada desde R9/R13 → **M33** |
| `check:texto` `check:ix2` `check:cascaron` | ⚠️ **NO CORRIERON.** Son de navegador visible y secuestran la pantalla ~90 min. `check:texto` ya estaba roja en `/` antes de esta sesión, verificado en su día en worktree limpio |

> ⚠️ **Lo que no corrió falla ABIERTO.** Está dicho, no escondido.

## 3 · No hay regresión — medido

El cambio de mayor alcance (el área táctil del pie) toca las 122 páginas. Se construyó el
estado **anterior** en un worktree aparte y se compararon alturas en 5 rutas × 4 anchos:

- **1920, 1440 y 991: delta 0** en altura de documento y de pie, en las cinco rutas.
- **479: +80 px exactos**, que es el hueco declarado del botón flotante (M8), acotado a ≤767.

## 4 · Repositorio

| Punto | Estado |
|---|---|
| Todo commiteado | ✅ árbol limpio |
| `r16-proy-carrusel` (2 commits sin mergear) integrada | ✅ entra en el merge a `main` |
| `main` sincronizada con el remoto | ✅ `2d33207..d140db7` |
| Sin stashes | ✅ |
| Sin secretos en el historial | ✅ `.env` y `.env.local` nunca versionados |
| Ramas y worktrees muertos | ⏳ ver §6 |

## 5 · Producción

| Punto | Cómo |
|---|---|
| Despliegue | `vercel deploy --prebuilt --prod` desde el build del worktree de release |
| Verificación post-despliegue | Rutas del inventario, formularios, sitemap, robots, canónicas, HTTPS y redirección apex→www |

## 6 · Limpieza pendiente de tu visto bueno

No se borra nada sin enseñarlo antes:

- Rama `ensayo-merge` — idéntica a `main` (`2d33207`), sin trabajo propio.
- Worktree `.claude/worktrees/adoring-panini-5f17df` — rama `claude/adoring-panini-5f17df`, ya mergeada en `main`.
- Worktree huérfano en `/private/tmp/…/deploy-worktree` — HEAD desprendido en `6ce84d6`.
- Worktrees de esta sesión: `auditoria-integral` y `release-main`.
- Proceso `astro dev` ajeno (PID 55481), vivo desde el jueves. **No se ha tocado**: es de otra sesión.

## 7 · Lo que sigue abierto para el cliente

- `SMTP_USER` / `SMTP_PASS` en el scope **Preview** de Vercel (producción sí los tiene: Sebastian probó los 5 formularios a mano y llegan).
- La entrega SMTP **no se puede verificar desde un agente**: en producción Turnstile no emite token a un navegador automatizado (403 medido) y un antibot no se sortea.

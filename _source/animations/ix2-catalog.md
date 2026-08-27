# Catálogo de interacciones (IX2) — Mr & Mrs Outdoor Living

Generado por `scripts/extract-ix2.mjs` desde `_source/webflow-export/js/webflow.js`.
**No editar a mano.** Payload crudo en `ix2.json`.

- **168 eventos** sobre **82 elementos únicos** (`data-w-id`)
- **12 listas de acción**
- **14 elementos arrancan en `opacity:0`** desde el `<style>` inline del `<head>`:
  si no reimplementas su animación, quedan invisibles para siempre.

## Breakpoints de Webflow (aplican a las mediaQueries de cada evento)

| key | min | max |
|---|---|---|
| `main` | 992 | ∞ |
| `medium` | 768 | 991 |
| `small` | 480 | 767 |
| `tiny` | 0 | 479 |

## Equivalencias de easing

| Webflow | CSS |
|---|---|
| `outQuart` | `cubic-bezier(0.165, 0.84, 0.44, 1)` |
| `easeInOut` | `cubic-bezier(0.455, 0.03, 0.515, 0.955)` |
| `ease` | `cubic-bezier(0.25, 0.1, 0.25, 1)` |

---

## `a-3` — DropdownOpen

- **5 eventos**: `DROPDOWN_OPEN` ×5
- **breakpoints**: `main+medium+small+tiny` ×5

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `GENERAL_DISPLAY` | 0 | 0 | — | value="none" |
| 0 | `GENERAL_DISPLAY` | 0 | 0 | — | value="block" |

## `a-4` — DropDown Close

- **5 eventos**: `DROPDOWN_CLOSE` ×5
- **breakpoints**: `main+medium+small+tiny` ×5

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `GENERAL_DISPLAY` | 0 | 0 | — | value="none" |
| 1 | `GENERAL_DISPLAY` | 0 | 0 | — | value="block" |

## `a-9` — Feature Checkbox [Check]

- **1 eventos**: `MOUSE_CLICK` ×1
- **breakpoints**: `main+medium+small+tiny` ×1

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `TRANSFORM_MOVE` | 0 | 0 | `ease` | xValue=1 xUnit="rem" yUnit="PX" zUnit="PX" |
| 0 | `STYLE_BACKGROUND_COLOR` | 0 | 0 | — | globalSwatchId="@var_variable-45991dc3" rValue=185 bValue=59 gValue=253 aValue=1 |
| 0 | `STYLE_BACKGROUND_COLOR` | 0 | 0 | — | globalSwatchId="@var_variable-4a3d901e-59ae-e01f-3c8e-c7d23ad547d9" rValue=36 bValue=36 gValue=36 aValue=1 |

## `a-10` — Feature Checkbox [Uncheck]

- **1 eventos**: `MOUSE_SECOND_CLICK` ×1
- **breakpoints**: `main+medium+small+tiny` ×1

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `TRANSFORM_MOVE` | 0 | 0 | `ease` | xValue=0 xUnit="rem" yUnit="PX" zUnit="PX" |
| 0 | `STYLE_BACKGROUND_COLOR` | 0 | 0 | — | globalSwatchId="@var_variable-c3882138-100e-a1cc-5409-1711b944db1c" rValue=161 bValue=161 gValue=161 aValue=1 |
| 0 | `STYLE_BACKGROUND_COLOR` | 0 | 0 | — | globalSwatchId="@var_variable-6301439f-dfa7-5abe-a490-14018a0b0f5b" rValue=76 bValue=76 gValue=76 aValue=1 |

## `a-12` — Menu Down

- **20 eventos**: `PAGE_SCROLL_UP` ×20
- **breakpoints**: `main+medium+small+tiny` ×20

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `TRANSFORM_MOVE` | 0 | 500 | `easeInOut` | yValue=0 xUnit="PX" yUnit="px" zUnit="PX" |
| 0 | `STYLE_OPACITY` | 0 | 500 | `easeInOut` | value=1 unit="" |

## `a-11` — Menu Up

- **20 eventos**: `PAGE_SCROLL_DOWN` ×20
- **breakpoints**: `main+medium+small+tiny` ×20

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `TRANSFORM_MOVE` | 0 | 500 | `easeInOut` | yValue=-85 xUnit="PX" yUnit="px" zUnit="PX" |
| 0 | `STYLE_OPACITY` | 0 | 500 | `easeInOut` | value=0 unit="" |

## `a-13` — DropdownOpen 3

- **5 eventos**: `DROPDOWN_OPEN` ×5
- **breakpoints**: `main+medium+small+tiny` ×5

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `GENERAL_DISPLAY` | 0 | 0 | — | value="none" |
| 0 | `GENERAL_DISPLAY` | 0 | 0 | — | value="block" |

## `a-14` — DropDown Close 3

- **5 eventos**: `DROPDOWN_CLOSE` ×5
- **breakpoints**: `main+medium+small+tiny` ×5

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `GENERAL_DISPLAY` | 0 | 0 | — | value="none" |
| 1 | `GENERAL_DISPLAY` | 0 | 0 | — | value="block" |

## `growIn`

- **77 eventos**: `SCROLL_INTO_VIEW` ×77
- **breakpoints**: `main+medium+small+tiny` ×58, `medium+small+tiny` ×17, `main` ×2

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `STYLE_OPACITY` | 0 | 0 | — | value=0 |
| 1 | `TRANSFORM_SCALE` | 0 | 0 | — | xValue=0.7500000000000001 yValue=0.7500000000000001 |
| 2 | `TRANSFORM_SCALE` | 0 | 1000 | `outQuart` | xValue=1 yValue=1 |
| 2 | `STYLE_OPACITY` | 0 | 1000 | `outQuart` | value=1 |

## `slideInRight`

- **9 eventos**: `SCROLL_INTO_VIEW` ×9
- **breakpoints**: `main` ×7, `main+medium+small+tiny` ×2

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `STYLE_OPACITY` | 0 | 0 | — | value=0 |
| 1 | `TRANSFORM_MOVE` | 0 | 0 | — | xValue=100 yValue=0 xUnit="PX" yUnit="PX" zUnit="PX" |
| 2 | `STYLE_OPACITY` | 0 | 1000 | `outQuart` | value=1 |
| 2 | `TRANSFORM_MOVE` | 0 | 1000 | `outQuart` | xValue=0 yValue=0 xUnit="PX" yUnit="PX" zUnit="PX" |

## `slideInLeft`

- **11 eventos**: `SCROLL_INTO_VIEW` ×11
- **breakpoints**: `main` ×9, `main+medium+small+tiny` ×2

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `STYLE_OPACITY` | 0 | 0 | — | value=0 |
| 1 | `TRANSFORM_MOVE` | 0 | 0 | — | xValue=-100 yValue=0 xUnit="PX" yUnit="PX" zUnit="PX" |
| 2 | `STYLE_OPACITY` | 0 | 1000 | `outQuart` | value=1 |
| 2 | `TRANSFORM_MOVE` | 0 | 1000 | `outQuart` | xValue=0 yValue=0 xUnit="PX" yUnit="PX" zUnit="PX" |

## `slideInBottom`

- **9 eventos**: `SCROLL_INTO_VIEW` ×9
- **breakpoints**: `main` ×2, `main+medium+small+tiny` ×7

| paso | acción | delay | duración | easing | valores |
|---|---|---|---|---|---|
| 0 | `STYLE_OPACITY` | 0 | 0 | — | value=0 |
| 1 | `TRANSFORM_MOVE` | 0 | 0 | — | xValue=0 yValue=100 xUnit="PX" yUnit="PX" zUnit="PX" |
| 2 | `TRANSFORM_MOVE` | 0 | 1000 | `outQuart` | xValue=0 yValue=0 xUnit="PX" yUnit="PX" zUnit="PX" |
| 2 | `STYLE_OPACITY` | 0 | 1000 | `outQuart` | value=1 |


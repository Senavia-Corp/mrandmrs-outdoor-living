# Mr & Mrs Outdoor Living — qué se auditó, qué se arregló

Auditoría integral del sitio, 4/5 de septiembre de 2026.

## Lo primero: el sitio estaba bien

Se recorrieron **las 122 páginas en 6 anchos de pantalla** — 732 mediciones automáticas, desde
un móvil de 375 px hasta un monitor de 1920 — comprobando que nada se sale, nada se pisa, ninguna
imagen falla y ninguna petición se cae.

**No apareció ni un solo problema de esos.** Cero desbordes horizontales, cero solapes, cero
imágenes rotas, cero errores en consola. El sitio es sólido en móvil y en escritorio, y sus
métricas de velocidad aprueban con holgura (carga del contenido principal en 0,34 s; el umbral
de Google son 2,5 s).

## Lo que sí estaba mal, y ya está arreglado

**1. En la página de contacto no se veían los enlaces legales.** El aviso «By submitting this
form, you agree to our Terms & Privacy Policy» se leía **«you agree to our  &»**: los dos
enlaces estaban en blanco sobre fondo blanco. Se pedía aceptar unas condiciones que no se podían
ni leer ni abrir, en la página donde llegan los clientes. Arreglado y comprobado en los 6 anchos.

**2. El teléfono aparecía tachado en móvil.** El número se partía por la mitad y la raya del
subrayado cruzaba los últimos cuatro dígitos. Ahora se lee limpio.

**3. Los enlaces del pie eran demasiado pequeños para el dedo** en las 122 páginas. Se han
llevado al mínimo que exige la norma de accesibilidad, **sin mover un solo píxel** del diseño.

**4. El botón flotante de llamada tapaba los enlaces legales del pie** —incluido el de
accesibilidad— y al final de la página no había forma de apartarlo. Ahora se le reserva sitio.

**5. Dos pares de fichas de obra competían entre sí en Google** por tener el mismo título.
Diferenciados con lo que cada obra ya decía de sí misma.

**6. La calculadora de presupuesto estaba descolgada**: ninguna página enlazaba con ella y no
tenía descripción para buscadores. Ya tiene ficha completa y está declarada en el sitemap.

**Y además**: se añadieron las cabeceras de seguridad que faltaban, se corrigió el `robots.txt`,
se arregló un texto que no llegaba al contraste mínimo, las páginas ya se comparten con imagen en
WhatsApp y redes, y se cerraron los enlaces externos que no llevaban protección.

## Lo que se ha dejado documentado y no se ha tocado

Con su motivo escrito, no en silencio:

- **Las imágenes podrían pesar la mitad en móvil.** Hoy se descargan 2,68 MB porque se sirven a
  tamaño de escritorio. No corre prisa —la velocidad ya aprueba— pero es la mejora con más
  recorrido que le queda al sitio, y es un trabajo aparte.
- **Cinco detalles de diseño** (una descripción que se corta a media palabra, el control del
  carrusel encima de un logotipo, el recorte de una foto) necesitan que alguien los mire y los
  apruebe antes de tocarlos.
- **Un aviso de seguridad en una dependencia** que, medido, no llega al código publicado, y cuyo
  «arreglo» consistiría en retroceder a una versión antigua que rompería la web.

## Estado

Todo desplegado y verificado sobre el dominio real: **las 121 direcciones del sitemap responden
correctamente**, el dominio sin `www` redirige al bueno, las cabeceras de seguridad están vivas y
el formulario rechaza los envíos automáticos como debe.

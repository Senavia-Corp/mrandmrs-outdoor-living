/**
 * QUE DIBUJO LLEVA CADA RAZON de «Why homeowners pick us».
 *
 * Las cuatro razones de una seccion llevan SIEMPRE icono (D-182). El dibujo se elige:
 *   · POR DATO, si la clave de la razon (`icono` en `captacion-servicios.json`) tiene dibujo en
 *     `src/assets/iconos-conf/<clave>.svg`;
 *   · POR POSICION, si no lo tiene: la clave no tiene dibujo todavia (`florida`) o la razon no
 *     tiene familia (`null`). Entonces sale el de su sitio en la fila.
 *
 * La clave del dato no se toca: dice de que habla la razon, no que dibujo hay. El dia que una
 * clave gane su dibujo, se anade el fichero y esas razones dejan de usar el respaldo solas.
 *
 * Sin dependencias: lo leen el componente (`ConfianzaCore.astro`) y la puerta (`check:iconos-conf`).
 */
export const RESPALDO = ['plano', 'licencia', '3d', 'permisos'];

/** `tiene(clave)` dice si esa clave tiene dibujo. Devuelve la clave del dibujo que se pinta. */
export const dibujoDe = (clave, posicion, tiene) => (clave != null && tiene(clave) ? clave : RESPALDO[posicion]);

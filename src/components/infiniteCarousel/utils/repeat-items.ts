/** Cantidad de veces que se repite el set de items para que el loop sea continuo. */
const SET_COUNT = 3;

/**
 * Repite un set de items para alimentar `InfiniteCarousel`.
 *
 * El track se mueve exactamente el ancho de un set, asi que el consumidor debe
 * renderizar tres copias: la animacion necesita un set previo y uno siguiente
 * para no mostrar huecos.
 */
export function repeatItems<T>(items: readonly T[]): T[] {
  return Array.from({ length: SET_COUNT }, () => items).flat();
}

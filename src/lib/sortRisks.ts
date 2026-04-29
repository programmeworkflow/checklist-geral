/**
 * Comparador de nomes que mantém entradas começando com "Outros..."
 * sempre por último, e os demais em ordem alfabética PT-BR.
 *
 * Uso:
 *   risks.sort(sortByNameOutrosLast)
 *   exames.sort(sortByNameOutrosLast)
 *   etc.
 */
export function sortByNameOutrosLast<T extends { name: string }>(a: T, b: T): number {
  const aOutros = isOutros(a.name);
  const bOutros = isOutros(b.name);
  if (aOutros && !bOutros) return 1;
  if (bOutros && !aOutros) return -1;
  return a.name.localeCompare(b.name, 'pt-BR');
}

function isOutros(name: string): boolean {
  return /^outros?\b/i.test(name.trim());
}

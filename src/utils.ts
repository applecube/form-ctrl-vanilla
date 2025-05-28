export const everyItem = <I = unknown>(list: I[], check?: (item: I) => boolean): boolean => {
  for (const item of list) {
    if (!(check ? check(item) : item)) return false;
  }
  return true;
};

export const ensureArray = <V = unknown>(
  value: V,
): V extends undefined ? [] : V extends unknown[] ? V : V[] => {
  // @ts-expect-error ts is dumb here for some reason
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
};

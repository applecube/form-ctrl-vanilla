export const everyItem = (list, check) => {
  for (const item of list) {
    if (!(check ? check(item) : item)) return false;
  }
  return true;
};

export const ensureArray = (val) => (val === undefined ? [] : Array.isArray(val) ? val : [val]);

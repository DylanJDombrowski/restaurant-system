export const isStuffedPizza = (menuItemName: string): boolean => {
  const name = menuItemName.toLowerCase();
  return name === "stuffed pizza" || name === "the chub";
};

export const isRegularPizza = (menuItemName: string): boolean => {
  return !isStuffedPizza(menuItemName);
};

export const getAvailableSizesForPizza = (menuItemName: string, allSizes: string[]): string[] => {
  if (isStuffedPizza(menuItemName)) {
    return allSizes.filter((size) => ["small", "medium", "large"].includes(size));
  }
  return allSizes;
};

export const getAvailableCrustsForPizza = (menuItemName: string): string[] => {
  if (isStuffedPizza(menuItemName)) {
    return ["stuffed"];
  }
  return ["thin", "double_dough", "gluten_free"];
};

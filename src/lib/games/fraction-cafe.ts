export type CafeOrder = {
  food: string;
  numerator: number;
  denominator: 2 | 4;
};

export const cafeOrders: CafeOrder[] = [
  { food: "pizza", numerator: 1, denominator: 2 },
  { food: "chocolate", numerator: 1, denominator: 4 },
  { food: "pie", numerator: 3, denominator: 4 },
  { food: "lasagna", numerator: 2, denominator: 4 },
  { food: "cake", numerator: 1, denominator: 2 },
];
export function getCafeFood(food: string) {
  const menu: Record<
    string,
    { label: string; shape: "circle" | "square" | "rectangle" }
  > = {
    pizza: { label: "pizza", shape: "circle" },
    pie: { label: "blueberry pie", shape: "circle" },
    chocolate: { label: "chocolate bar", shape: "square" },
    lasagna: { label: "lasagna", shape: "rectangle" },
    cake: { label: "cake", shape: "square" },
  };
  return menu[food] ?? menu.cake;
}

export function getFractionName(order: CafeOrder) {
  if (order.denominator === 2) return "one half";
  return ["", "one quarter", "two quarters", "three quarters"][order.numerator];
}

export function isCafeOrderComplete(order: CafeOrder, selected: number[]) {
  return (
    new Set(selected).size === order.numerator &&
    selected.every(
      (slice) =>
        Number.isInteger(slice) && slice >= 0 && slice < order.denominator,
    )
  );
}

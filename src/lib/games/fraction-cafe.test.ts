import { describe, expect, it } from "vitest";
import {
  cafeOrders,
  getFractionName,
  isCafeOrderComplete,
} from "./fraction-cafe";

describe("Fraction Café orders", () => {
  it("accepts exactly the required number of distinct equal pieces", () => {
    const order = { food: "pie", numerator: 3, denominator: 4 } as const;
    expect(isCafeOrderComplete(order, [0, 2, 3])).toBe(true);
    expect(isCafeOrderComplete(order, [0, 2])).toBe(false);
    expect(isCafeOrderComplete(order, [0, 0, 2])).toBe(false);
    expect(isCafeOrderComplete(order, [0, 2, 4])).toBe(false);
    expect(getFractionName(order)).toBe("three quarters");
    expect(cafeOrders).toHaveLength(5);
  });
});

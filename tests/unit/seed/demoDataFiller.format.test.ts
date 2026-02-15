import { describe, expect, it } from "vitest";
import { createDemoDataFiller } from "../../../server/services/demoDataFiller";

describe("PKG-09 Unit: demoDataFiller formats", () => {
  it("builds employee email as firstname.lastname@email.de", () => {
    const filler = createDemoDataFiller(12345);
    const employee = filler.nextEmployee(0, "seed");
    expect(employee.email).toMatch(/^[a-z0-9.]+@email\.de$/);
  });

  it("builds customer email as firstname.lastname@email.de (deterministic by seed)", () => {
    const fillerA = createDemoDataFiller(98765);
    const fillerB = createDemoDataFiller(98765);
    const customerA = fillerA.nextCustomer(0, "seed");
    const customerB = fillerB.nextCustomer(0, "seed");
    expect(customerA.email).toMatch(/^[a-z0-9.]+@email\.de$/);
    expect(customerA.email).toBe(customerB.email);
  });

  it("generates plausible German phone numbers", () => {
    const filler = createDemoDataFiller(24680);
    const phonePattern = /^\+49 (?:(?:15[1257]|16[02]|17[0-9]) \d{7}|(?:30|40|69|89|211|221) \d{5,7})$/;
    for (let i = 0; i < 100; i += 1) {
      const employee = filler.nextEmployee(i, "seed");
      expect(employee.phone).toMatch(phonePattern);
    }
  });
});


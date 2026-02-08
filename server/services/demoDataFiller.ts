import { Faker, de } from "@faker-js/faker";
import type { InsertCustomer, InsertEmployee } from "@shared/schema";

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

function phoneNumber(faker: Faker) {
  const p1 = faker.number.int({ min: 100, max: 999 });
  const p2 = faker.number.int({ min: 1000000, max: 9999999 });
  return `+49 ${p1} ${p2}`;
}

export function createDemoDataFiller(seed: number) {
  const faker = new Faker({ locale: [de] });
  faker.seed(seed);

  function nextEmployee(index: number, seedPrefix: string): InsertEmployee {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const local = slug(`${firstName}.${lastName}.${seedPrefix}.${index + 1}`);
    return {
      firstName,
      lastName,
      email: `${local}@demo.local`,
      phone: phoneNumber(faker),
    };
  }

  function nextCustomer(index: number, seedPrefix: string): InsertCustomer {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const company = faker.company.name();
    const city = faker.location.city();
    const postalCode = faker.location.zipCode("#####");
    const street = faker.location.streetAddress();
    const customerSlug = slug(company || `${firstName}.${lastName}`);
    return {
      customerNumber: `D-${seedPrefix}-${String(index + 1).padStart(4, "0")}`,
      firstName,
      lastName,
      company,
      email: `kunde.${seedPrefix}.${index + 1}.${customerSlug}@demo.local`,
      phone: phoneNumber(faker),
      addressLine1: street,
      addressLine2: null,
      postalCode,
      city,
    };
  }

  return {
    nextEmployee,
    nextCustomer,
  };
}

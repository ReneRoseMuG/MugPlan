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
  const mobilePrefixes = ["151", "152", "155", "157", "160", "162", "170", "171", "172", "173", "174", "175", "176", "177", "178", "179"];
  const landlineAreaCodes = ["30", "40", "69", "89", "211", "221"];
  const mode = faker.number.int({ min: 0, max: 1 });
  if (mode === 0) {
    const prefix = mobilePrefixes[faker.number.int({ min: 0, max: mobilePrefixes.length - 1 })];
    const subscriber = faker.number.int({ min: 1000000, max: 9999999 });
    return `+49 ${prefix} ${subscriber}`;
  }
  const areaCode = landlineAreaCodes[faker.number.int({ min: 0, max: landlineAreaCodes.length - 1 })];
  const subscriber = faker.number.int({ min: 100000, max: 9999999 });
  return `+49 ${areaCode} ${subscriber}`;
}

export function createDemoDataFiller(seed: number) {
  const faker = new Faker({ locale: [de] });
  faker.seed(seed);

  function nextEmployee(_index: number, _seedPrefix: string): InsertEmployee {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const local = slug(`${firstName}.${lastName}`);
    return {
      firstName,
      lastName,
      email: `${local}@email.de`,
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
    return {
      customerNumber: `D-${seedPrefix}-${String(index + 1).padStart(4, "0")}`,
      firstName,
      lastName,
      company,
      email: `${slug(`${firstName}.${lastName}`)}@email.de`,
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

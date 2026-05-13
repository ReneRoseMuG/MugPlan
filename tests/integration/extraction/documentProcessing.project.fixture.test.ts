/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Alle hinterlegten Projekt-PDF-Fallbeispiele laufen über den echten `project_form`-Extract.
 * - Varianten für Firmenkunde, Personenkunde, unterschiedliche Telefonlabels und Ausland werden vollständig ausgewertet.
 * - Der Feldreport markiert fehlende oder mangelhafte Daten deterministisch, ohne Komplettabbruch.
 *
 * Fehlerfaelle:
 * - Eine reale Fixture führt zu Extract-Fehlern, unvollständigen Kerndaten oder unerwarteten Warnings.
 * - Namens-, Firmen-, Telefon- oder Länderfälle werden nicht stabil erkannt.
 *
 * Ziel:
 * Die reale Projekt-Fixture-Suite als Regression für den vollständigen Doc-Extract absichern.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from "../../../server/services/documentProcessingService";

type ProjectFixtureExpectation = {
  file: string;
  customer: {
    customerNumber: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    phone: string | null;
    addressLine1: string;
    postalCode: string;
    city: string;
    country: string;
  };
  orderNumber: string;
  amount: string;
  saunaModel: string;
  articleItemsCount?: number;
  issueKeys?: string[];
  warnings?: string[];
  recognizedKeys: string[];
  missing: Array<{
    key: string;
    reason: string;
  }>;
};

const projectExtractFixtures: ProjectFixtureExpectation[] = [
  {
    file: "BSP CompanyName Only.pdf",
    customer: {
      customerNumber: "161979",
      firstName: null,
      lastName: null,
      company: "B&E Wohnprojekte GmbH",
      phone: "01520-5613413",
      addressLine1: "Carl-Reuther-Str. 1",
      postalCode: "68305",
      city: "Mannheim",
      country: "Deutschland",
    },
    orderNumber: "A0218253A",
    amount: "6264.50",
    saunaModel: "S1004388 Sonderposten Thermoholz D-AB in verschiedenen Abmessungen auf",
    articleItemsCount: 2,
    recognizedKeys: [
      "customerNumber",
      "company",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "firstName", reason: "Firmenkunde ohne Personenname im Dokumentkopf." },
      { key: "lastName", reason: "Firmenkunde ohne Personenname im Dokumentkopf." },
    ],
  },
  {
    file: "BSP Country.pdf",
    customer: {
      customerNumber: "160673",
      firstName: "Tom",
      lastName: "Voosen",
      company: null,
      phone: "00352-621222479",
      addressLine1: "1 Tommesknapp",
      postalCode: "7419",
      city: "Brouch",
      country: "Luxemburg",
    },
    orderNumber: "A0218277A",
    amount: "19515.00",
    saunaModel: "Exklusiv Sauna",
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP Customer CompanyName.pdf",
    customer: {
      customerNumber: "163180",
      firstName: "Lars",
      lastName: "Bartilla",
      company: "Fahrrad Meinhold GmbH",
      phone: null,
      addressLine1: "Hannoversche Straße 164",
      postalCode: "30823",
      city: "Garbsen",
      country: "Deutschland",
    },
    orderNumber: "BE19322",
    amount: "54.40",
    saunaModel: "S1004511 Kopfkissen KARAT 80 x 80",
    articleItemsCount: 2,
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "company",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "phone", reason: "Kein gültiges Mobil- oder Telefonfeld erkannt." },
    ],
  },
  {
    file: "BSP Customer.pdf",
    customer: {
      customerNumber: "163033",
      firstName: "Leif",
      lastName: "Döpking",
      company: null,
      phone: "0152-53500769",
      addressLine1: "Ellerdamm 28",
      postalCode: "27339",
      city: "Riede, Kreis Verden",
      country: "Deutschland",
    },
    orderNumber: "A0118067A",
    amount: "8850.00",
    saunaModel: "Suuri Sauna",
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP Mobil.pdf",
    customer: {
      customerNumber: "163059",
      firstName: "Holger",
      lastName: "Haake",
      company: null,
      phone: "0172-4540748",
      addressLine1: "Uhlhornskamp 12",
      postalCode: "27243",
      city: "Harpstedt",
      country: "Deutschland",
    },
    orderNumber: "A0117990A",
    amount: "7000.00",
    saunaModel: "FassSauna",
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP PLZ.pdf",
    customer: {
      customerNumber: "160521",
      firstName: "Swen",
      lastName: "Wischnowsky",
      company: null,
      phone: "0172-7940641",
      addressLine1: "Ulmenweg 8",
      postalCode: "989610",
      city: "Sömmerda",
      country: "Deutschland",
    },
    orderNumber: "A0418684A",
    amount: "150.00",
    saunaModel: "S1004637 Instandsetzung : Innentür der Exclusiv aus Nov 2024 ist verzogen, bitte nacharbeiten; Ofen zeigt",
    articleItemsCount: 2,
    issueKeys: ["postalCodeFormat"],
    warnings: ["PLZ „989610“ hat nicht das erwartete vier- oder fünfstellige Format."],
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP Rekla falsche Reihenfolge.pdf",
    customer: {
      customerNumber: "162588",
      firstName: "Lars",
      lastName: "Bokop",
      company: null,
      phone: "0170-4782658",
      addressLine1: "Wilhelm-von-Ketteler-Strasse 7",
      postalCode: "49661",
      city: "Cloppenburg",
      country: "Deutschland",
    },
    orderNumber: "A0518845A",
    amount: "0.00",
    saunaModel: "S1004637 Instandsetzung einer XL vom 07.01.2026 : Sikanähte nacharbeiten und neu setzen, da bei Aufbau extreme Kälte",
    articleItemsCount: 2,
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP Rekla richtige Reihenfolge.pdf",
    customer: {
      customerNumber: "161658",
      firstName: "Reimund",
      lastName: "Wisotzki",
      company: null,
      phone: "0162-8832481",
      addressLine1: "Zörbiger Str. 21",
      postalCode: "06794",
      city: "Glebitzsch",
      country: "Deutschland",
    },
    orderNumber: "A0418771A",
    amount: "0.00",
    saunaModel: "S1004637 Instandsetzung einer Palkkio aus Oktober 2025 : Sika Nähte nacharbeiten, da Sauna Wasser durchlässt",
    articleItemsCount: 2,
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP Tel.pdf",
    customer: {
      customerNumber: "163053",
      firstName: "Christoph",
      lastName: "Becker",
      company: null,
      phone: "024614068760",
      addressLine1: "Vogelsangstr. 5 a",
      postalCode: "52428",
      city: "Jülich",
      country: "Deutschland",
    },
    orderNumber: "A0118045A",
    amount: "7600.00",
    saunaModel: "FassSauna",
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
  {
    file: "BSP default.pdf",
    customer: {
      customerNumber: "163059",
      firstName: "Holger",
      lastName: "Haake",
      company: null,
      phone: "0172-4540748",
      addressLine1: "Uhlhornskamp 12",
      postalCode: "27243",
      city: "Harpstedt",
      country: "Deutschland",
    },
    orderNumber: "A0117990A",
    amount: "7000.00",
    saunaModel: "FassSauna",
    recognizedKeys: [
      "customerNumber",
      "firstName",
      "lastName",
      "phone",
      "addressLine1",
      "postalCode",
      "city",
      "country",
      "orderNumber",
      "amount",
      "saunaModel",
    ],
    missing: [
      { key: "company", reason: "Keine Firmenzeile im Dokumentkopf erkannt." },
    ],
  },
];

describe("FT21 integration: project extraction fixture suite", () => {
  it.each(projectExtractFixtures)(
    "extracts order data from $file without hard errors",
    async (fixture) => {
      const fixturePath = path.resolve(process.cwd(), "tests/fixtures/Doc Extract", fixture.file);
      expect(fs.existsSync(fixturePath)).toBe(true);

      const pdfBuffer = fs.readFileSync(fixturePath);
      const result = await extractFromPdf({
        scope: "project_form",
        fileBuffer: pdfBuffer,
      });

      expect(result.customer.customerNumber).toBe(fixture.customer.customerNumber);
      expect(result.customer.firstName).toBe(fixture.customer.firstName);
      expect(result.customer.lastName).toBe(fixture.customer.lastName);
      expect(result.customer.company).toBe(fixture.customer.company);
      expect(result.customer.phone).toBe(fixture.customer.phone);
      expect(result.customer.addressLine1).toBe(fixture.customer.addressLine1);
      expect(result.customer.postalCode).toBe(fixture.customer.postalCode);
      expect(result.customer.city).toBe(fixture.customer.city);
      expect(result.customer.country).toBe(fixture.customer.country);
      expect(result.orderNumber).toBe(fixture.orderNumber);
      expect(result.amount).toBe(fixture.amount);
      expect(result.saunaModel).toBe(fixture.saunaModel);
      if (fixture.articleItemsCount !== undefined) {
        expect(result.articleItems.length).toBe(fixture.articleItemsCount);
      } else {
        expect(result.articleItems.length).toBeGreaterThan(0);
      }
      expect(result.warnings).toEqual(fixture.warnings ?? []);
      expect(result.fieldReport.issues.map((item) => item.key)).toEqual(fixture.issueKeys ?? []);
      expect(result.fieldReport.recognized.map((item) => item.key)).toEqual(fixture.recognizedKeys);
      expect(
        result.fieldReport.missing.map((item) => ({
          key: item.key,
          reason: item.reason,
        })),
      ).toEqual(fixture.missing);
    },
  );
});

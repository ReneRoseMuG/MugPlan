import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  appointments,
  customerNotes,
  customerAttachments,
  customers,
  projectOrder,
  projects,
  type Customer,
  type CustomerAttachment,
  type InsertCustomer,
  type InsertCustomerAttachment,
  type Tag,
  type UpdateCustomer,
} from "@shared/schema";
import { getCustomerTagsByCustomerIds } from "./tagRelationsRepository";
import { customerSelectWithEffectiveAddress } from "./effectiveDeliveryAddress";
import * as addressesRepository from "./customerAddressesRepository";

type CustomerAddressFields = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
};

// Normalisiert die optionalen Adressfelder auf den Eingabetyp des Adress-Backends
// (undefined -> null), das die Rechnungsadresse als einzige Schreibstelle pflegt.
function toAddressFieldInput(fields: CustomerAddressFields): addressesRepository.CustomerAddressFieldInput {
  return {
    addressLine1: fields.addressLine1 ?? null,
    addressLine2: fields.addressLine2 ?? null,
    postalCode: fields.postalCode ?? null,
    city: fields.city ?? null,
    country: fields.country ?? null,
  };
}

/**
 * Spiegelt die Rechnungsadresse (customer_address, roleKey=BILLING) in die flachen
 * Kundenadressfelder. Ab dem Umzug ist die Adresszeile das Original; die flachen Felder
 * bleiben als abgeleiteter Spiegel erhalten, damit das Kundenobjekt konsistent bleibt
 * (MS-68, Weg 1). Die Kunden-version wird bewusst nicht angetastet: reine Spiegelung
 * ohne fachliches Kunden-Update und ohne Optimistic-Lock-Effekt.
 */
export async function mirrorBillingAddressToCustomerColumns(
  customerId: number,
  fields: CustomerAddressFields,
): Promise<void> {
  await db
    .update(customers)
    .set({
      addressLine1: fields.addressLine1 ?? null,
      addressLine2: fields.addressLine2 ?? null,
      postalCode: fields.postalCode ?? null,
      city: fields.city ?? null,
      country: fields.country ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(customers.id, customerId));
}

/**
 * Setzt die Rechnungsadresse eines bestehenden Kunden auf die übergebenen Werte und
 * spiegelt sie in die flachen Kundenspalten. Ausschließlich für interne System-/Seed-
 * Pfade gedacht (z. B. Abwesenheits-Systemkunde, Seed-Stammdaten), die ihre Adresse fest
 * vorgeben — nicht für den API-Kundenpfad, der seine Adressen über die Adress-API pflegt.
 */
export async function applyBillingAddressMirrored(
  customerId: number,
  fields: CustomerAddressFields,
): Promise<void> {
  const addressFields = toAddressFieldInput(fields);
  await db.transaction(async (tx) => {
    await addressesRepository.ensureBillingAddressTx(tx, customerId, addressFields);
    await tx
      .update(customers)
      .set({
        ...addressFields,
        updatedAt: sql`now()`,
      })
      .where(eq(customers.id, customerId));
  });
}

export type CustomerWithTags = Customer & { tags: Tag[] };
export type CustomerListItem = Customer & { notesCount: number; tags: Tag[] };
export type CustomerBoardListItem = CustomerListItem & {
  appointmentsCount: number;
  nextAppointmentStartDate: string | null;
  nextAppointmentStartTimeHour: number | null;
  historicalAppointments: Array<{
    id: number;
    startDate: string;
    startTime: string | null;
    orderNumber: string | null;
    projectName: string;
  }>;
  attachmentsCount: number;
};

export type CustomerBoardListResult = {
  items: CustomerBoardListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBerlinTodayDate(): Date {
  const berlinToday = berlinFormatter.format(new Date());
  return new Date(`${berlinToday}T00:00:00`);
}

export async function getCustomers(
  scope: "active" | "inactive" = "active",
  tagIds: number[] = [],
): Promise<CustomerListItem[]> {
  const conditions = buildCustomerFilterConditions({ scope, tagIds });
  const rows = await db
    .select(customerSelectWithEffectiveAddress())
    .from(customers)
    .where(and(...conditions))
    .orderBy(customers.id);

  const customerIds = rows.map((row) => row.id);
  if (customerIds.length === 0) return [];

  const noteCountRows = await db
    .select({
      customerId: customerNotes.customerId,
      count: sql<number>`count(*)`,
    })
    .from(customerNotes)
    .where(inArray(customerNotes.customerId, customerIds))
    .groupBy(customerNotes.customerId);

  const notesCountByCustomerId = new Map(noteCountRows.map((row) => [row.customerId, Number(row.count)] as const));
  const tagsByCustomerId = await getCustomerTagsByCustomerIds(customerIds);
  return rows.map((row) => ({
    ...row,
    notesCount: notesCountByCustomerId.get(row.id) ?? 0,
    tags: tagsByCustomerId.get(row.id) ?? [],
  }));
}

function buildCustomerFilterConditions(params: {
  scope: "active" | "inactive";
  lastName?: string;
  customerNumber?: string;
  tagIds?: number[];
}) {
  const conditions = [eq(customers.isActive, params.scope === "active")];
  const lastName = params.lastName?.trim().toLowerCase() ?? "";
  const customerNumber = params.customerNumber?.trim() ?? "";
  const tagIds = Array.from(new Set((params.tagIds ?? []).filter((value) => Number.isFinite(value) && value > 0)));

  if (lastName.length > 0) {
    const pattern = `%${lastName}%`;
    conditions.push(or(
      sql`lower(coalesce(${customers.lastName}, '')) like ${pattern}`,
      sql`lower(coalesce(${customers.firstName}, '')) like ${pattern}`,
      sql`lower(coalesce(${customers.fullName}, '')) like ${pattern}`,
    )!);
  }

  if (customerNumber.length > 0) {
    conditions.push(like(customers.customerNumber, `%${customerNumber}%`));
  }

  if (tagIds.length > 0) {
    const tagIdList = sql.join(tagIds.map((id) => sql`${id}`), sql`, `);
    conditions.push(sql`exists (
      select 1
      from customer_tags
      where customer_tags.customer_id = ${customers.id}
        and customer_tags.tag_id in (${tagIdList})
    )`);
  }

  return conditions;
}

function normalizeAppointmentDate(dateValue: unknown): string | null {
  if (dateValue instanceof Date) {
    return dateValue.toISOString().slice(0, 10);
  }
  if (typeof dateValue === "string") {
    return dateValue.slice(0, 10);
  }
  return null;
}

function normalizeStartTimeHour(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const [hours] = value.split(":");
  const parsed = Number(hours);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function getCustomersPaged(params: {
  scope: "active" | "inactive";
  lastName?: string;
  customerNumber?: string;
  tagIds?: number[];
  page: number;
  pageSize: number;
}): Promise<CustomerBoardListResult> {
  const conditions = buildCustomerFilterConditions(params);
  const offset = (params.page - 1) * params.pageSize;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(and(...conditions));

  const total = Number(totalRow?.count ?? 0);
  if (total === 0) {
    return {
      items: [],
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 0,
    };
  }

  const rows = await db
    .select(customerSelectWithEffectiveAddress())
    .from(customers)
    .where(and(...conditions))
    .orderBy(asc(customers.customerNumber), asc(customers.id))
    .limit(params.pageSize)
    .offset(offset);

  const customerIds = rows.map((row) => row.id);

  const noteCountRows = await db
    .select({
      customerId: customerNotes.customerId,
      count: sql<number>`count(*)`,
    })
    .from(customerNotes)
    .where(inArray(customerNotes.customerId, customerIds))
    .groupBy(customerNotes.customerId);

  const appointmentRows = await db
    .select({
      customerId: appointments.customerId,
      startDate: appointments.startDate,
      startTime: appointments.startTime,
      id: appointments.id,
    })
    .from(appointments)
    .where(inArray(appointments.customerId, customerIds))
    .orderBy(
      asc(appointments.customerId),
      asc(appointments.startDate),
      asc(sql`coalesce(${appointments.startTime}, '23:59:59')`),
      asc(appointments.id),
    );

  const historicalAppointmentRows = await db
    .select({
      customerId: appointments.customerId,
      id: appointments.id,
      startDate: appointments.startDate,
      startTime: appointments.startTime,
      orderNumber: sql<string | null>`coalesce(${projectOrder.orderNumber}, null)`,
      projectName: sql<string>`coalesce(${projects.name}, 'Ohne Projekt')`,
    })
    .from(appointments)
    .leftJoin(projects, eq(appointments.projectId, projects.id))
    .leftJoin(projectOrder, eq(projectOrder.projectId, projects.id))
    .where(and(
      inArray(appointments.customerId, customerIds),
      sql`${appointments.startDate} < ${getBerlinTodayDate()}`,
    ))
    .orderBy(
      asc(appointments.customerId),
      desc(appointments.startDate),
      desc(sql`coalesce(${appointments.startTime}, '23:59:59')`),
      desc(appointments.id),
    );

  const notesCountByCustomerId = new Map(noteCountRows.map((row) => [row.customerId, Number(row.count)] as const));

  const attachmentCountRows = await db
    .select({
      customerId: customerAttachments.customerId,
      count: sql<number>`count(*)`,
    })
    .from(customerAttachments)
    .where(inArray(customerAttachments.customerId, customerIds))
    .groupBy(customerAttachments.customerId);

  const attachmentsCountByCustomerId = new Map(attachmentCountRows.map((row) => [row.customerId, Number(row.count)] as const));

  const tagsByCustomerId = await getCustomerTagsByCustomerIds(customerIds);
  const appointmentSummaryByCustomerId = new Map<number, {
    appointmentsCount: number;
    nextAppointmentStartDate: string | null;
    nextAppointmentStartTimeHour: number | null;
    nextAppointmentId: number | null;
  }>();
  const historicalAppointmentsByCustomerId = new Map<number, CustomerBoardListItem["historicalAppointments"]>();

  for (const row of appointmentRows) {
    const current = appointmentSummaryByCustomerId.get(row.customerId);
    if (!current) {
      appointmentSummaryByCustomerId.set(row.customerId, {
        appointmentsCount: 1,
        nextAppointmentStartDate: normalizeAppointmentDate(row.startDate),
        nextAppointmentStartTimeHour: normalizeStartTimeHour(row.startTime),
        nextAppointmentId: row.id,
      });
      continue;
    }

    current.appointmentsCount += 1;
  }

  for (const row of historicalAppointmentRows) {
    const list = historicalAppointmentsByCustomerId.get(row.customerId) ?? [];
    if (list.length >= 5) continue;
    list.push({
      id: row.id,
      startDate: normalizeAppointmentDate(row.startDate) ?? "",
      startTime: typeof row.startTime === "string" ? row.startTime : null,
      orderNumber: row.orderNumber,
      projectName: row.projectName,
    });
    historicalAppointmentsByCustomerId.set(row.customerId, list);
  }

  return {
    items: rows.map((row) => {
      const appointmentSummary = appointmentSummaryByCustomerId.get(row.id);
      return {
        ...row,
        notesCount: notesCountByCustomerId.get(row.id) ?? 0,
        tags: tagsByCustomerId.get(row.id) ?? [],
        appointmentsCount: appointmentSummary?.appointmentsCount ?? 0,
        nextAppointmentStartDate: appointmentSummary?.nextAppointmentStartDate ?? null,
        nextAppointmentStartTimeHour: appointmentSummary?.nextAppointmentStartTimeHour ?? null,
        nextAppointmentId: appointmentSummary?.nextAppointmentId ?? null,
        historicalAppointments: historicalAppointmentsByCustomerId.get(row.id) ?? [],
        attachmentsCount: attachmentsCountByCustomerId.get(row.id) ?? 0,
      };
    }),
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export async function getCustomer(id: number): Promise<CustomerWithTags | null> {
  const [customer] = await db.select(customerSelectWithEffectiveAddress()).from(customers).where(eq(customers.id, id));
  if (!customer) return null;
  const tagsByCustomerId = await getCustomerTagsByCustomerIds([id]);
  return {
    ...customer,
    tags: tagsByCustomerId.get(id) ?? [],
  };
}

export async function listCustomerNumbers(): Promise<string[]> {
  const rows = await db
    .select({ customerNumber: customers.customerNumber })
    .from(customers);
  return rows.map((row) => row.customerNumber);
}

export async function getCustomersByCustomerNumber(customerNumber: string): Promise<CustomerWithTags[]> {
  const rows = await db
    .select(customerSelectWithEffectiveAddress())
    .from(customers)
    .where(eq(customers.customerNumber, customerNumber.trim()));

  const customerIds = rows.map((row) => row.id);
  if (customerIds.length === 0) return [];

  const tagsByCustomerId = await getCustomerTagsByCustomerIds(customerIds);
  return rows.map((row) => ({
    ...row,
    tags: tagsByCustomerId.get(row.id) ?? [],
  }));
}

export async function getCustomersByExactDisplayName(displayName: string): Promise<CustomerWithTags[]> {
  const normalizedDisplayName = displayName.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
  const rows = await db
    .select(customerSelectWithEffectiveAddress())
    .from(customers)
    .where(or(
      sql`lower(trim(coalesce(${customers.fullName}, ''))) = ${normalizedDisplayName}`,
      sql`lower(trim(coalesce(${customers.company}, ''))) = ${normalizedDisplayName}`,
    )!);

  const customerIds = rows.map((row) => row.id);
  if (customerIds.length === 0) return [];

  const tagsByCustomerId = await getCustomerTagsByCustomerIds(customerIds);
  return rows.map((row) => ({
    ...row,
    tags: tagsByCustomerId.get(row.id) ?? [],
  }));
}

export async function getCustomersByExactNameParts(firstName: string, lastName: string): Promise<CustomerWithTags[]> {
  const normalizedFirstName = firstName.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
  const normalizedLastName = lastName.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
  const rows = await db
    .select(customerSelectWithEffectiveAddress())
    .from(customers)
    .where(and(
      sql`lower(trim(coalesce(${customers.firstName}, ''))) = ${normalizedFirstName}`,
      sql`lower(trim(coalesce(${customers.lastName}, ''))) = ${normalizedLastName}`,
    ));

  const customerIds = rows.map((row) => row.id);
  if (customerIds.length === 0) return [];

  const tagsByCustomerId = await getCustomerTagsByCustomerIds(customerIds);
  return rows.map((row) => ({
    ...row,
    tags: tagsByCustomerId.get(row.id) ?? [],
  }));
}

export async function createCustomer(
  data: InsertCustomer & { fullName: string | null },
  options?: { billingAddress?: CustomerAddressFields },
): Promise<Customer> {
  const billingAddress = options?.billingAddress ?? null;
  return db.transaction(async (tx) => {
    // Der API-Kundenpfad übergibt keine Adresse (billingAddress = null): Es entsteht eine
    // leere Rechnungsadress-Zeile, die der Client anschließend über die Adress-API befüllt.
    // System-/Seed-Kunden geben ihre Adresse explizit vor; dann werden die flachen Spalten
    // als Spiegel gleich mitgeschrieben. Die flachen Felder dienen nie als Eingabe.
    const insertValues = billingAddress
      ? {
          ...data,
          addressLine1: billingAddress.addressLine1 ?? null,
          addressLine2: billingAddress.addressLine2 ?? null,
          postalCode: billingAddress.postalCode ?? null,
          city: billingAddress.city ?? null,
          country: billingAddress.country ?? null,
        }
      : data;
    const result = await tx.insert(customers).values(insertValues);
    const insertId = (result as any)[0].insertId;
    // Die Rechnungsadresse wird ausschließlich über das Adress-Backend angelegt (eine
    // Schreibstelle); ohne explizite Adresse entsteht eine leere Rechnungsadress-Zeile.
    await addressesRepository.ensureBillingAddressTx(
      tx,
      insertId,
      billingAddress ? toAddressFieldInput(billingAddress) : undefined,
    );
    const [customer] = await tx.select().from(customers).where(eq(customers.id, insertId));
    return customer;
  });
}

export async function updateCustomerWithVersion(
  id: number,
  expectedVersion: number,
  data: UpdateCustomer & { fullName?: string | null },
): Promise<{ kind: "updated"; customer: Customer } | { kind: "version_conflict" }> {
  const updateData: Record<string, unknown> = {
    updatedAt: sql`now()`,
    version: sql`${customers.version} + 1`,
  };

  if (data.customerNumber !== undefined) updateData.customerNumber = data.customerNumber;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  // MS-68: Adressfelder werden hier nicht mehr verarbeitet — die Rechnungsadresse wird
  // ausschließlich über die Adress-API (customer_address) gepflegt und von dort in die
  // flachen Kundenspalten gespiegelt.

  return db.transaction(async (tx) => {
    const result = await tx
      .update(customers)
      .set(updateData)
      .where(and(eq(customers.id, id), eq(customers.version, expectedVersion)));

    const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
    if (affectedRows === 0) {
      return { kind: "version_conflict" };
    }

    const [customer] = await tx.select().from(customers).where(eq(customers.id, id));
    return { kind: "updated", customer };
  });
}

export async function getCustomerAttachments(customerId: number): Promise<CustomerAttachment[]> {
  return db
    .select()
    .from(customerAttachments)
    .where(eq(customerAttachments.customerId, customerId))
    .orderBy(desc(customerAttachments.createdAt));
}

export async function getCustomerAttachmentById(id: number): Promise<CustomerAttachment | null> {
  const [attachment] = await db
    .select()
    .from(customerAttachments)
    .where(eq(customerAttachments.id, id));
  return attachment ?? null;
}

export async function createCustomerAttachment(data: InsertCustomerAttachment): Promise<CustomerAttachment> {
  const result = await db.insert(customerAttachments).values(data);
  const insertId = (result as any)[0].insertId;
  const [attachment] = await db
    .select()
    .from(customerAttachments)
    .where(eq(customerAttachments.id, insertId));
  return attachment;
}

export async function deleteCustomerAttachment(id: number): Promise<void> {
  await db.delete(customerAttachments).where(eq(customerAttachments.id, id));
}

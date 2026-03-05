import { mysqlTable, text, int, date, time, boolean, bigint, decimal, primaryKey, varchar, timestamp, json, uniqueIndex, index, check } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customer - Kundenverwaltung (FT 09)
export const customers = mysqlTable("customer", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerNumber: varchar("customer_number", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  postalCode: varchar("postal_code", { length: 255 }),
  city: varchar("city", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

const customerEmailSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== "string") return value;
    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  },
  z.string().email().nullable().optional(),
);

const customerRequiredTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return value.trim();
  },
  z.string().min(1),
);

const customerOptionalTextSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== "string") return value;
    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  },
  z.string().nullable().optional(),
);

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  isActive: true,
  fullName: true,
}).extend({
  customerNumber: customerRequiredTextSchema,
  firstName: customerOptionalTextSchema,
  lastName: customerOptionalTextSchema,
  company: customerOptionalTextSchema,
  email: customerEmailSchema,
  phone: customerOptionalTextSchema,
  addressLine1: customerOptionalTextSchema,
  addressLine2: customerOptionalTextSchema,
  postalCode: customerOptionalTextSchema,
  city: customerOptionalTextSchema,
});

export const updateCustomerSchema = z.object({
  customerNumber: customerRequiredTextSchema.optional(),
  firstName: customerOptionalTextSchema,
  lastName: customerOptionalTextSchema,
  company: customerOptionalTextSchema,
  email: customerEmailSchema,
  phone: customerOptionalTextSchema,
  addressLine1: customerOptionalTextSchema,
  addressLine2: customerOptionalTextSchema,
  postalCode: customerOptionalTextSchema,
  city: customerOptionalTextSchema,
  isActive: z.boolean().optional(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export const tours = mysqlTable("tours", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 255 }).notNull().default("#2563eb"),
  version: int("version").notNull().default(1),
});

export const TOUR_DEFAULT_COLOR = "#2563eb";

export const insertTourSchema = createInsertSchema(tours)
  .omit({ id: true, name: true })
  .extend({
    color: z.string().trim().min(1).default(TOUR_DEFAULT_COLOR),
  });
export const updateTourSchema = z.object({ color: z.string() });

export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type UpdateTour = z.infer<typeof updateTourSchema>;

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 255 }).notNull(),
  version: int("version").notNull().default(1),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, name: true });
export const updateTeamSchema = z.object({ color: z.string() });

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type UpdateTeam = z.infer<typeof updateTeamSchema>;

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type Role = typeof roles.$inferSelect;

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  roleId: int("role_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at"),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type User = typeof users.$inferSelect;

// Note - Notizverwaltung (FT 13)
export const notes = mysqlTable("note", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  color: varchar("color", { length: 255 }),
  isPinned: boolean("is_pinned").notNull().default(false),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isPinned: true,
  color: true,
});

export const updateNoteSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
export type CreateNoteInput = z.infer<typeof insertNoteSchema>;
export type UpdateNote = z.infer<typeof updateNoteSchema>;

// Note Template - Notizvorlagen (FT 13)
export const noteTemplates = mysqlTable("note_template", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  color: varchar("color", { length: 255 }),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertNoteTemplateSchema = createInsertSchema(noteTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNoteTemplateSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  color: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type NoteTemplate = typeof noteTemplates.$inferSelect;
export type InsertNoteTemplate = z.infer<typeof insertNoteTemplateSchema>;
export type UpdateNoteTemplate = z.infer<typeof updateNoteTemplateSchema>;

// Customer Note Relation (FT 13)
export const customerNotes = mysqlTable("customer_note", {
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  noteId: bigint("note_id", { mode: "number" }).notNull().references(() => notes.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.customerId, table.noteId] }),
}));

// Project - Projektverwaltung (FT 02)
export const projects = mysqlTable("project", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  orderNumber: varchar("order_number", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "restrict" }),
  descriptionMd: text("description_md"),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  byCustomerActiveUpdated: index("idx_project_customer_active_updated").on(
    table.customerId,
    table.isActive,
    table.updatedAt,
  ),
}));

const projectAmountSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return value;
      return value.toFixed(2);
    }
    if (typeof value === "string") {
      const normalized = value.trim().replace(",", ".");
      return normalized.length === 0 ? null : normalized;
    }
    return value;
  },
  z
    .string()
    .regex(/^-?\d+(?:\.\d{1,2})?$/, "amount must have at most 2 decimal places")
    .transform((value) => Number(value).toFixed(2))
    .nullable()
    .optional(),
);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
}).extend({
  amount: projectAmountSchema,
});

export const updateProjectSchema = z.object({
  name: z.string().optional(),
  orderNumber: z.string().nullable().optional(),
  amount: projectAmountSchema,
  customerId: z.number().optional(),
  descriptionMd: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

// Product Categories - Produktkategorien (FT 27)
export const productCategories = mysqlTable("product_categories", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProductCategorySchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().optional(),
}).partial();

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type UpdateProductCategory = z.infer<typeof updateProductCategorySchema>;

// Component Categories - Komponenten-Kategorien (FT 27)
export const componentCategories = mysqlTable("component_categories", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertComponentCategorySchema = createInsertSchema(componentCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateComponentCategorySchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().optional(),
}).partial();

export type ComponentCategory = typeof componentCategories.$inferSelect;
export type InsertComponentCategory = z.infer<typeof insertComponentCategorySchema>;
export type UpdateComponentCategory = z.infer<typeof updateComponentCategorySchema>;

// Products - Produkte (FT 27)
export const products = mysqlTable("products", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  categoryId: bigint("category_id", { mode: "number" })
    .notNull()
    .references(() => productCategories.id, { onDelete: "restrict" }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProductSchema = z.object({
  name: z.string().optional(),
  categoryId: z.number().int().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().optional(),
}).partial();

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

// Components - Komponenten (FT 27)
export const components = mysqlTable("components", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  categoryId: bigint("category_id", { mode: "number" })
    .notNull()
    .references(() => componentCategories.id, { onDelete: "restrict" }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertComponentSchema = createInsertSchema(components).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateComponentSchema = z.object({
  name: z.string().optional(),
  categoryId: z.number().int().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().optional(),
}).partial();

export type Component = typeof components.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type UpdateComponent = z.infer<typeof updateComponentSchema>;

// Product <-> Component Relation (FT 27)
export const productComponent = mysqlTable("product_component", {
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  componentId: bigint("component_id", { mode: "number" })
    .notNull()
    .references(() => components.id, { onDelete: "restrict" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.componentId] }),
  byComponentProduct: index("idx_pc_component_product").on(table.componentId, table.productId),
}));

export const insertProductComponentSchema = createInsertSchema(productComponent);

export type ProductComponent = typeof productComponent.$inferSelect;
export type InsertProductComponent = z.infer<typeof insertProductComponentSchema>;

export const projectOrderItemSourceSchema = z.enum(["product", "component", "text"]);

const hasNonEmptyProjectOrderItemDescription = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

const validateProjectOrderItemSource = (
  value: {
    source: "product" | "component" | "text";
    productId?: number | null;
    componentId?: number | null;
    description?: string | null;
  },
  ctx: z.RefinementCtx,
): void => {
  const hasProduct = value.productId != null;
  const hasComponent = value.componentId != null;
  const hasText = hasNonEmptyProjectOrderItemDescription(value.description);
  const selectedSourceCount = [hasProduct, hasComponent, hasText].filter(Boolean).length;

  if (selectedSourceCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exactly one of productId, componentId, or non-empty description must be set.",
      path: ["source"],
    });
    return;
  }

  if (value.source === "product" && !hasProduct) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "source 'product' requires productId.",
      path: ["productId"],
    });
  }

  if (value.source === "component" && !hasComponent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "source 'component' requires componentId.",
      path: ["componentId"],
    });
  }

  if (value.source === "text" && !hasText) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "source 'text' requires a non-empty description.",
      path: ["description"],
    });
  }
};

// Project Order Items - Auftragspositionen je Projekt (FT 27)
export const projectOrderItems = mysqlTable("project_order_items", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  productId: bigint("product_id", { mode: "number" })
    .references(() => products.id, { onDelete: "restrict" }),
  componentId: bigint("component_id", { mode: "number" })
    .references(() => components.id, { onDelete: "restrict" }),
  description: text("description"),
  quantity: int("quantity").notNull().default(1),
  source: varchar("source", { length: 20 }).notNull(),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  byProject: index("idx_order_items_project").on(table.projectId),
  quantityPositive: check("chk_project_order_items_quantity_positive", sql`${table.quantity} > 0`),
  sourceConsistent: check(
    "chk_project_order_items_source_consistent",
    sql`(
      (${table.source} = 'product'
       AND ${table.productId} IS NOT NULL
       AND ${table.componentId} IS NULL
       AND (${table.description} IS NULL OR char_length(trim(${table.description})) = 0))
      OR
      (${table.source} = 'component'
       AND ${table.componentId} IS NOT NULL
       AND ${table.productId} IS NULL
       AND (${table.description} IS NULL OR char_length(trim(${table.description})) = 0))
      OR
      (${table.source} = 'text'
       AND ${table.productId} IS NULL
       AND ${table.componentId} IS NULL
       AND ${table.description} IS NOT NULL
       AND char_length(trim(${table.description})) > 0)
    )`,
  ),
}));

export const insertProjectOrderItemSchema = createInsertSchema(projectOrderItems)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    source: projectOrderItemSourceSchema,
    quantity: z.number().int().positive(),
  })
  .superRefine((value, ctx) => validateProjectOrderItemSource(value, ctx));

export const updateProjectOrderItemSchema = z.object({
  projectId: z.number().int().optional(),
  productId: z.number().int().nullable().optional(),
  componentId: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().int().positive().optional(),
  source: projectOrderItemSourceSchema.optional(),
  version: z.number().int().optional(),
}).partial().superRefine((value, ctx) => {
  const touchesSourceFields =
    value.source !== undefined ||
    value.productId !== undefined ||
    value.componentId !== undefined ||
    value.description !== undefined;

  if (!touchesSourceFields) {
    return;
  }

  if (value.source === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "source is required when updating productId, componentId, or description.",
      path: ["source"],
    });
    return;
  }

  validateProjectOrderItemSource(
    {
      source: value.source,
      productId: value.productId,
      componentId: value.componentId,
      description: value.description,
    },
    ctx,
  );
});

export type ProjectOrderItem = typeof projectOrderItems.$inferSelect;
export type InsertProjectOrderItem = z.infer<typeof insertProjectOrderItemSchema>;
export type UpdateProjectOrderItem = z.infer<typeof updateProjectOrderItemSchema>;

// Project Note Relation (FT 02)
export const projectNotes = mysqlTable("project_note", {
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  noteId: bigint("note_id", { mode: "number" }).notNull().references(() => notes.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.noteId] }),
}));

// Project Attachment - Projektanhänge (FT 02)
export const projectAttachments = mysqlTable("project_attachment", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  fileSize: int("file_size").notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectAttachmentSchema = createInsertSchema(projectAttachments).omit({
  id: true,
  createdAt: true,
});

export type ProjectAttachment = typeof projectAttachments.$inferSelect;
export type InsertProjectAttachment = z.infer<typeof insertProjectAttachmentSchema>;

// Customer Attachment - Kundenanhänge (FT 19)
export const customerAttachments = mysqlTable("customer_attachment", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  fileSize: int("file_size").notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerAttachmentSchema = createInsertSchema(customerAttachments).omit({
  id: true,
  createdAt: true,
});

export type CustomerAttachment = typeof customerAttachments.$inferSelect;
export type InsertCustomerAttachment = z.infer<typeof insertCustomerAttachmentSchema>;

// Appointment - Terminverwaltung (FT 01)
export const appointments = mysqlTable("appointments", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  tourId: int("tour_id").references(() => tours.id, { onDelete: "restrict", onUpdate: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  startTime: time("start_time"),
  endDate: date("end_date"),
  endTime: time("end_time"),
  externalEventId: varchar("external_event_id", { length: 255 }),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  byStartDate: index("idx_appt_start_date").on(table.startDate),
  byProjectStartTimeId: index("idx_appt_project_start_time_id").on(
    table.projectId,
    table.startDate,
    table.startTime,
    table.id,
  ),
  byTourStartTimeId: index("idx_appt_tour_start_time_id").on(
    table.tourId,
    table.startDate,
    table.startTime,
    table.id,
  ),
}));

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// Project Status - Projektstatusverwaltung (FT 15)
export const projectStatus = mysqlTable("project_status", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 255 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertProjectStatusSchema = createInsertSchema(projectStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDefault: true,
});

export const updateProjectStatusSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type ProjectStatus = typeof projectStatus.$inferSelect;
export type InsertProjectStatus = z.infer<typeof insertProjectStatusSchema>;
export type UpdateProjectStatus = z.infer<typeof updateProjectStatusSchema>;

// Project <-> Project Status Relation (FT 02/15)
export const projectProjectStatus = mysqlTable("project_project_status", {
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  projectStatusId: bigint("project_status_id", { mode: "number" }).notNull().references(() => projectStatus.id, { onDelete: "restrict" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.projectStatusId] }),
}));

// Tags - universelles Tagging (FT 28)
export const tags = mysqlTable("tags", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  byIsDefault: index("idx_tags_is_default").on(table.isDefault),
}));

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTagSchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
  version: z.number().int().optional(),
}).partial();

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;

export const projectTags = mysqlTable("project_tags", {
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  tagId: bigint("tag_id", { mode: "number" }).notNull().references(() => tags.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.tagId] }),
  byTagProject: index("idx_project_tags_tag_project").on(table.tagId, table.projectId),
}));

export const customerTags = mysqlTable("customer_tags", {
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  tagId: bigint("tag_id", { mode: "number" }).notNull().references(() => tags.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.customerId, table.tagId] }),
  byTagCustomer: index("idx_customer_tags_tag_customer").on(table.tagId, table.customerId),
}));

export const employeeTags = mysqlTable("employee_tags", {
  employeeId: bigint("employee_id", { mode: "number" }).notNull().references(() => employees.id, { onDelete: "cascade" }),
  tagId: bigint("tag_id", { mode: "number" }).notNull().references(() => tags.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.employeeId, table.tagId] }),
  byTagEmployee: index("idx_employee_tags_tag_employee").on(table.tagId, table.employeeId),
}));

export const appointmentTags = mysqlTable("appointment_tags", {
  appointmentId: bigint("appointment_id", { mode: "number" }).notNull().references(() => appointments.id, { onDelete: "cascade" }),
  tagId: bigint("tag_id", { mode: "number" }).notNull().references(() => tags.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.appointmentId, table.tagId] }),
  byTagAppointment: index("idx_appointment_tags_tag_appointment").on(table.tagId, table.appointmentId),
}));

// Employee - Mitarbeiterverwaltung (FT 05)
export const employees = mysqlTable("employee", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  teamId: int("team_id").references(() => teams.id, { onDelete: "set null" }),
  tourId: int("tour_id").references(() => tours.id, { onDelete: "set null" }),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  byActiveNameId: index("idx_employee_active_name_id").on(
    table.isActive,
    table.lastName,
    table.firstName,
    table.id,
  ),
}));

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  teamId: true,
  tourId: true,
  fullName: true,
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;

// Employee Attachment - Mitarbeiteranhänge (FT 19)
export const employeeAttachments = mysqlTable("employee_attachment", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  employeeId: bigint("employee_id", { mode: "number" }).notNull().references(() => employees.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  fileSize: int("file_size").notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmployeeAttachmentSchema = createInsertSchema(employeeAttachments).omit({
  id: true,
  createdAt: true,
});

export type EmployeeAttachment = typeof employeeAttachments.$inferSelect;
export type InsertEmployeeAttachment = z.infer<typeof insertEmployeeAttachmentSchema>;

// Appointment <-> Employee Relation (FT 01)
export const appointmentEmployees = mysqlTable("appointment_employee", {
  appointmentId: bigint("appointment_id", { mode: "number" })
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  employeeId: bigint("employee_id", { mode: "number" })
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.appointmentId, table.employeeId] }),
  byEmployeeAppointment: index("idx_ae_employee_appointment").on(table.employeeId, table.appointmentId),
}));

export type AppointmentEmployee = typeof appointmentEmployees.$inferSelect;

// Appointment Note Relation (FT 01)
export const appointmentNotes = mysqlTable("appointment_note", {
  appointmentId: bigint("appointment_id", { mode: "number" })
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  noteId: bigint("note_id", { mode: "number" })
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.appointmentId, table.noteId] }),
  byNoteAppointment: index("idx_an_note_appointment").on(table.noteId, table.appointmentId),
}));

export type AppointmentNote = typeof appointmentNotes.$inferSelect;

// Help Texts (FT 16)
export const helpTexts = mysqlTable("help_texts", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  helpKey: varchar("help_key", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertHelpTextSchema = createInsertSchema(helpTexts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateHelpTextSchema = createInsertSchema(helpTexts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type HelpText = typeof helpTexts.$inferSelect;
export type InsertHelpText = z.infer<typeof insertHelpTextSchema>;
export type UpdateHelpText = z.infer<typeof updateHelpTextSchema>;

export const seedRuns = mysqlTable("seed_run", {
  id: varchar("id", { length: 36 }).primaryKey(),
  configJson: json("config_json").$type<unknown>().notNull(),
  summaryJson: json("summary_json").$type<unknown>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const seedRunEntities = mysqlTable(
  "seed_run_entity",
  {
    seedRunId: varchar("seed_run_id", { length: 36 })
      .notNull()
      .references(() => seedRuns.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: bigint("entity_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.seedRunId, table.entityType, table.entityId] }),
    bySeedRun: index("seed_run_entity_seed_run_idx").on(table.seedRunId),
    byEntity: index("seed_run_entity_entity_idx").on(table.entityType, table.entityId),
  }),
);

export type SeedRun = typeof seedRuns.$inferSelect;
export type SeedRunEntity = typeof seedRunEntities.$inferSelect;

export const userSettingsValue = mysqlTable(
  "user_settings_value",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    settingKey: varchar("setting_key", { length: 128 }).notNull(),
    scopeType: varchar("scope_type", { length: 16 }).notNull(),
    scopeId: varchar("scope_id", { length: 128 }).notNull(),
    valueJson: json("value_json").$type<unknown>().notNull(),
    version: int("version").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    updatedBy: bigint("updated_by", { mode: "number" }),
  },
  (table) => ({
    settingScopeUnique: uniqueIndex("user_settings_value_key_scope_unique").on(
      table.settingKey,
      table.scopeType,
      table.scopeId,
    ),
  }),
);

export type UserSettingsValue = typeof userSettingsValue.$inferSelect;

export const backupLog = mysqlTable("backup_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: varchar("status", { length: 16 }).notNull(),
  errorMessage: text("error_message"),
  exportedRecordCount: int("exported_record_count").notNull().default(0),
  filePath: text("file_path"),
}, (table) => ({
  byCreatedAtId: index("idx_backup_created_id").on(table.createdAt, table.id),
  byStatusCreatedAtId: index("idx_backup_status_created_id").on(
    table.status,
    table.createdAt,
    table.id,
  ),
}));

export type BackupLog = typeof backupLog.$inferSelect;

export const calendarSyncLog = mysqlTable("calendar_sync_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  appointmentId: bigint("appointment_id", { mode: "number" }),
  action: varchar("action", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  byAppointmentCreated: index("idx_calendar_sync_appointment_created").on(
    table.appointmentId,
    table.createdAt,
  ),
  byStatusCreated: index("idx_calendar_sync_status_created").on(table.status, table.createdAt),
}));

export type CalendarSyncLog = typeof calendarSyncLog.$inferSelect;

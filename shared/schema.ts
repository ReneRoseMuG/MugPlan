import { mysqlTable, text, int, date, time, boolean, bigint, primaryKey, varchar, timestamp, json, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customer - Kundenverwaltung (FT 09)
export const customers = mysqlTable("customer", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerNumber: varchar("customer_number", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }).notNull(),
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

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  isActive: true,
  fullName: true,
}).extend({
  email: customerEmailSchema,
});

export const updateCustomerSchema = z.object({
  customerNumber: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().nullable().optional(),
  email: customerEmailSchema,
  phone: z.string().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export const tours = mysqlTable("tours", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 255 }).notNull(),
  version: int("version").notNull().default(1),
});

export const insertTourSchema = createInsertSchema(tours).omit({ id: true, name: true });
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
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "restrict" }),
  descriptionMd: text("description_md"),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});

export const updateProjectSchema = z.object({
  name: z.string().optional(),
  customerId: z.number().optional(),
  descriptionMd: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

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
  tourId: int("tour_id").references(() => tours.id, { onDelete: "set null", onUpdate: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  startTime: time("start_time"),
  endDate: date("end_date"),
  endTime: time("end_time"),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

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
});

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
}));

export type AppointmentEmployee = typeof appointmentEmployees.$inferSelect;

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

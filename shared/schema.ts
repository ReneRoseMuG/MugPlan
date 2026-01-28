import { pgTable, text, serial, date, boolean, timestamp, bigserial, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Customer - Kundenverwaltung (FT 09)
export const customers = pgTable("customer", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerNumber: text("customer_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(),
  company: text("company"),
  phone: text("phone").notNull(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  postalCode: text("postal_code"),
  city: text("city"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  isActive: true,
  fullName: true,
});

export const updateCustomerSchema = z.object({
  customerNumber: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().nullable().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true });

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const insertTourSchema = createInsertSchema(tours).omit({ id: true, name: true });
export const updateTourSchema = z.object({ color: z.string() });

export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type UpdateTour = z.infer<typeof updateTourSchema>;

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, name: true });
export const updateTeamSchema = z.object({ color: z.string() });

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type UpdateTeam = z.infer<typeof updateTeamSchema>;

// Note - Notizverwaltung (FT 13)
export const notes = pgTable("note", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isPinned: true,
});

export const updateNoteSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type UpdateNote = z.infer<typeof updateNoteSchema>;

// Note Template - Notizvorlagen (FT 13)
export const noteTemplates = pgTable("note_template", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNoteTemplateSchema = createInsertSchema(noteTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNoteTemplateSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type NoteTemplate = typeof noteTemplates.$inferSelect;
export type InsertNoteTemplate = z.infer<typeof insertNoteTemplateSchema>;
export type UpdateNoteTemplate = z.infer<typeof updateNoteTemplateSchema>;

// Customer Note Relation (FT 13)
export const customerNotes = pgTable("customer_note", {
  customerId: bigserial("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  noteId: bigserial("note_id", { mode: "number" }).notNull().references(() => notes.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.customerId, table.noteId] }),
}));

// Project Note Relation (FT 13) - prepared for future use
export const projectNotes = pgTable("project_note", {
  projectId: bigserial("project_id", { mode: "number" }).notNull(),
  noteId: bigserial("note_id", { mode: "number" }).notNull().references(() => notes.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.noteId] }),
}));

// Project Status - Projektstatusverwaltung (FT 15)
export const projectStatus = pgTable("project_status", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

// Project <-> Project Status Relation (FT 15) - prepared for future use
export const projectProjectStatus = pgTable("project_project_status", {
  projectId: bigserial("project_id", { mode: "number" }).notNull(),
  projectStatusId: bigserial("project_status_id", { mode: "number" }).notNull().references(() => projectStatus.id, { onDelete: "restrict" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.projectStatusId] }),
}));

// Employee - Mitarbeiterverwaltung (FT 05)
export const employees = pgTable("employee", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  teamId: true,
  tourId: true,
  fullName: true, // auto-generated from firstName + lastName
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

// Help Texts (FT 16)
export const helpTexts = pgTable("help_texts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  helpKey: text("help_key").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

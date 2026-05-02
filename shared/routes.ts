import { z } from 'zod';
import { appointmentDisplayModes } from "./appointmentDisplayMode";
import { absenceTypeValues } from "./absenceAppointments";
import { MONITORING_TRIGGER_CODES, MONITORING_TRIGGER_COLORS, MONITORING_TRIGGER_NAMES } from "./monitoring";
import { 
  insertTourSchema, updateTourSchema, tours, 
  insertTeamSchema, updateTeamSchema, teams,
  insertCustomerSchema, updateCustomerSchema, customers,
  insertNoteSchema, updateNoteSchema, notes,
  insertNoteTemplateSchema, updateNoteTemplateSchema, noteTemplates,
  insertProjectSchema, updateProjectSchema,
  updateProjectOrderSchema,
  insertProjectOrderItemSchema, updateProjectOrderItemSchema, projectOrderItems,
  projectAttachments,
  customerAttachments,
  employeeAttachments,
  appointmentAttachments,
  insertEmployeeSchema, updateEmployeeSchema, employees,
  insertHelpTextSchema, updateHelpTextSchema, helpTexts,
  tags,
  insertProductCategorySchema, updateProductCategorySchema, productCategories,
  insertComponentCategorySchema, updateComponentCategorySchema, componentCategories,
  insertProductSchema, updateProductSchema, products,
  insertComponentSchema, updateComponentSchema, components,
} from './schema';
import type { Project, ProjectOrder } from "./schema";
import type { ProjectArticleItem } from "./projectArticleList";
import type { AppointmentMutationEvent, ProjectMutationEvent } from "./appointmentMutationEvents";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const extractionScopeSchema = z.enum(["project_form", "appointment_form", "customer_form"]);

const extractedCustomerSchema = z.object({
  customerNumber: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable().optional(),
});

const extractedArticleItemSchema = z.object({
  quantity: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
});

const extractedArticleCategorySchema = z.object({
  category: z.string().min(1),
  items: z.array(extractedArticleItemSchema),
});

const extractedFieldReportSectionSchema = z.enum(["customer", "project"]);

const extractedFieldRecognizedSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  section: extractedFieldReportSectionSchema,
  value: z.string().min(1),
});

const extractedFieldMissingSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  section: extractedFieldReportSectionSchema,
  reason: z.string().min(1),
});

const extractedFieldReportSchema = z.object({
  recognized: z.array(extractedFieldRecognizedSchema),
  missing: z.array(extractedFieldMissingSchema),
});

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const germanStateCodeSchema = z.enum([
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
]);

export const calendarMarkerTypeSchema = z.enum([
  "public_holiday",
  "company_holiday",
  "company_vacation",
]);
export const calendarMarkerSourceSchema = z.enum(["automatic", "admin"]);
export const calendarMarkerScopeSchema = z.enum(["national", "regional", "company"]);

export const calendarMarkerSchema = z.object({
  id: z.string().min(1),
  date: dateOnlySchema,
  endDate: dateOnlySchema.nullable(),
  name: z.string().min(1),
  type: calendarMarkerTypeSchema,
  source: calendarMarkerSourceSchema,
  scope: calendarMarkerScopeSchema,
  states: z.array(germanStateCodeSchema),
  active: z.boolean(),
  note: z.string().nullable(),
  version: z.number().int().min(1),
});

export const calendarMarkerWriteSchema = z.object({
  date: dateOnlySchema,
  endDate: dateOnlySchema.nullable().optional(),
  name: z.string().min(1),
  type: calendarMarkerTypeSchema,
  source: calendarMarkerSourceSchema.default("admin"),
  scope: calendarMarkerScopeSchema.default("company"),
  states: z.array(germanStateCodeSchema).default([]),
  active: z.boolean().default(true),
  note: z.string().nullable().optional(),
}).strict();

export const calendarMarkerUpdateSchema = calendarMarkerWriteSchema.extend({
  version: z.number().int().min(1),
});

const documentExtractionLatestProjectAppointmentSchema = z.object({
  id: z.number().int().positive(),
  startDate: z.string().min(1),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  startTimeHour: z.number().int().min(0).max(23).nullable(),
  tourName: z.string().nullable(),
  customerName: z.string().nullable(),
});

const entityAppointmentsScopeSchema = z.enum(["upcoming", "all"]);
const tagNameSchema = z.string().min(1).max(100);
const tagColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const tagSchema = z.custom<typeof tags.$inferSelect>();
const tagRelationItemSchema = z.object({
  tag: tagSchema,
  relationVersion: z.number().int().min(1),
});
const tagPickerDomainSchema = z.enum(["appointment", "project", "customer", "employee"]);

const entityAppointmentsQuerySchema = z.object({
  scope: entityAppointmentsScopeSchema.default("upcoming"),
  fromDate: z.string().optional(),
}).strict();

const employeeAppointmentAbsenceInputSchema = z.object({
  absenceType: z.enum(absenceTypeValues),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
}).strict();

const activeScopeSchema = z.enum(["active", "inactive", "all"]).default("active");

const projectArticleItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  source: z.enum(["product", "component"]).optional(),
  shortCode: z.string().nullable().optional(),
});

const appointmentTagGroupsSchema = z.object({
  appointmentTags: z.array(tagSchema),
  customerTags: z.array(tagSchema),
  projectTags: z.array(tagSchema),
});

const journalContextSchema = z.object({
  contextTable: z.string().min(1),
  contextId: z.number().int().positive().nullable(),
  contextKey: z.string().nullable(),
  relationRole: z.string().nullable(),
});

const journalEntrySchema = z.object({
  id: z.number().int().positive(),
  tableName: z.string().min(1),
  recordId: z.number().int().positive().nullable(),
  recordKey: z.string().nullable(),
  op: z.string().min(1),
  field: z.string().nullable(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  snapshot: z.unknown().nullable(),
  actorUserId: z.number().int().positive().nullable(),
  actorName: z.string().nullable(),
  triggerKey: z.string().nullable(),
  messageText: z.string().min(1),
  isRaw: z.boolean(),
  createdAt: z.string().min(1),
  contexts: z.array(journalContextSchema),
});

const journalListInputSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contextTable: z.string().trim().min(1).optional(),
  contextId: z.coerce.number().int().positive().optional(),
  contextKey: z.string().trim().min(1).optional(),
  actor: z.string().trim().optional(),
  q: z.string().trim().optional(),
  triggerKey: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

const journalListResponseSchema = z.object({
  items: z.array(journalEntrySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

const tourEmployeeCascadeConflictReasonSchema = z.enum([
  "EMPLOYEE_OVERLAP",
  "ALREADY_ASSIGNED",
]);

const tourEmployeeCascadeSkipReasonSchema = z.enum([
  "ALREADY_ASSIGNED",
  "NOT_ASSIGNED",
  "HISTORICAL_APPOINTMENT",
  "APPOINTMENT_NOT_ON_TOUR",
  "EMPLOYEE_OVERLAP",
]);

const tourEmployeeCascadeAppointmentEmployeeSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string(),
});

const tourEmployeeCascadePreviewItemSchema = z.object({
  appointmentId: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  tourName: z.string().nullable(),
  customerNumber: z.string().nullable(),
  customerName: z.string().nullable(),
  projectName: z.string().nullable(),
  orderNumber: z.string().nullable(),
  currentEmployees: z.array(tourEmployeeCascadeAppointmentEmployeeSchema),
  eligible: z.boolean(),
  conflictReason: tourEmployeeCascadeConflictReasonSchema.nullable(),
});

const tourEmployeeCascadePreviewInputSchema = z.object({
  employeeId: z.number().int().positive(),
});

const tourEmployeeCascadeExecuteInputSchema = z.object({
  employeeId: z.number().int().positive(),
  selectedAppointmentIds: z.array(z.number().int().positive()),
});

const tourEmployeeCascadeExecuteResponseSchema = z.object({
  updatedAppointmentCount: z.number().int().min(0),
  skipped: z.array(z.object({
    appointmentId: z.number().int().positive(),
    reason: tourEmployeeCascadeSkipReasonSchema,
  })),
});

const tourEmployeeCascadeConflictResponseSchema = z.object({
  code: z.literal("BUSINESS_CONFLICT"),
  conflictEmployees: z.array(tourEmployeeCascadeAppointmentEmployeeSchema).optional(),
}).passthrough();

const tourWeekEmployeeMemberSchema = z.object({
  assignmentId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
});

const tourWeekEmployeesWeekSchema = z.object({
  tourId: z.number().int().positive(),
  tourName: z.string(),
  tourColor: z.string().nullable(),
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  isLocked: z.boolean(),
  isBlocked: z.boolean(),
  appointmentsCount: z.number().int().min(0),
  notesCount: z.number().int().min(0),
  employees: z.array(tourWeekEmployeeMemberSchema),
});

const tourWeekSchema = z.object({
  id: z.number().int().positive(),
  tourId: z.number().int().positive(),
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  isLocked: z.boolean(),
  isBlocked: z.boolean(),
});

const tourWeekCreateInputSchema = z.object({
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
}).strict();

const tourWeekAvailabilityInputSchema = z.object({
  isoYear: z.coerce.number().int().min(1),
  isoWeek: z.coerce.number().int().min(1).max(53),
}).strict();

const tourWeekStatusMutationResponseSchema = z.object({
  week: tourWeekSchema,
  tourName: z.string().nullable().optional(),
  affectedAppointmentCount: z.number().int().min(0),
});

const employeeWeekPlanningItemSchema = z.object({
  assignmentId: z.number().int().positive(),
  tourId: z.number().int().positive(),
  tourName: z.string(),
  tourColor: z.string().nullable(),
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  isLocked: z.boolean(),
  isBlocked: z.boolean(),
  appointmentsCount: z.number().int().min(0),
  notesCount: z.number().int().min(0),
  members: z.array(tourWeekEmployeeMemberSchema),
  employees: z.array(tourWeekEmployeeMemberSchema),
});

const employeeRevenueOverviewAppointmentSchema = z.object({
  appointmentId: z.number().int().positive(),
  startDate: z.string(),
  projectName: z.string(),
  orderNumber: z.string().nullable(),
  amount: z.string(),
});

const employeeRevenueOverviewWeekSchema = z.object({
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  weekLabel: z.string(),
  orderCount: z.number().int().min(0),
  revenueAmount: z.string(),
  appointments: z.array(employeeRevenueOverviewAppointmentSchema),
});

const employeeRevenueOverviewResponseSchema = z.object({
  employeeId: z.number().int().positive(),
  employeeFullName: z.string(),
  weeks: z.array(employeeRevenueOverviewWeekSchema),
});

const tourWeekAppointmentPreviewStatusSchema = z.enum([
  "will_add",
  "conflict",
  "already_assigned",
  "will_remove",
  "understaffed",
  "keep",
]);

const tourWeekAppointmentPreviewItemSchema = z.object({
  appointmentId: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  projectName: z.string().nullable(),
  customerName: z.string().nullable(),
  status: tourWeekAppointmentPreviewStatusSchema,
  selectable: z.boolean(),
  conflictReason: z.string().nullable(),
  isUnderstaffed: z.boolean().optional(),
});

const tourWeekAddPreviewInputSchema = z.object({
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  employeeId: z.number().int().positive(),
});

const tourWeekExecuteInputSchema = z.object({
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  employeeId: z.number().int().positive().optional(),
  selectedAppointmentIds: z.array(z.number().int().positive()),
});

const tourWeekRemovePreviewInputSchema = z.object({
  assignmentId: z.number().int().positive(),
});

const tourWeekExecuteResponseSchema = z.object({
  assignmentId: z.number().int().positive().optional(),
  employeeId: z.number().int().positive().optional(),
  employeeName: z.string().optional(),
  tourName: z.string().nullable().optional(),
  isoYear: z.number().int().min(1).optional(),
  isoWeek: z.number().int().min(1).max(53).optional(),
  updatedAppointmentCount: z.number().int().min(0),
  changedAppointmentIds: z.array(z.number().int().positive()).optional(),
  skipped: z.array(z.object({
    appointmentId: z.number().int().positive(),
    reason: z.string(),
  })),
});

const tourWeekConflictResponseSchema = z.object({
  code: z.enum(["BUSINESS_CONFLICT", "PAST_WEEK_READONLY"]),
  message: z.string().optional(),
}).passthrough();

const appointmentWeekEmployeePreviewStatusSchema = z.enum([
  "will_add",
  "conflict",
  "already_present",
  "current_only",
]);

const appointmentWeekEmployeePreviewItemSchema = z.object({
  employeeId: z.number().int().positive(),
  employeeName: z.string(),
  status: appointmentWeekEmployeePreviewStatusSchema,
  selectable: z.boolean(),
  conflictReason: z.string().nullable(),
});

const tourAssignmentPreviewInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  existingEmployeeIds: z.array(z.number().int().positive()),
}).strict();

const appointmentTourChangePreviewInputSchema = z.object({
  newTourId: z.number().int().positive().nullable(),
  newStartDate: z.string(),
  newEndDate: z.string().nullable().optional(),
  newStartTime: z.string().nullable().optional(),
  currentEmployeeIds: z.array(z.number().int().positive()).optional(),
}).strict();

const appointmentWeekEmployeePreviewResponseSchema = z.object({
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  hasWeekPlan: z.boolean(),
  currentEmployeeIds: z.array(z.number().int().positive()),
  items: z.array(appointmentWeekEmployeePreviewItemSchema),
});

const entityAppointmentItemSchema = z.object({
  id: z.number(),
  version: z.number().int().min(1),
  projectId: z.number().nullable(),
  projectName: z.string(),
  projectVersion: z.number().int().min(1).nullable(),
  projectOrderNumber: z.string().nullable(),
  projectArticleItems: z.array(projectArticleItemSchema),
  projectDescription: z.string().nullable(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  startTimeHour: z.number().int().min(0).max(23).nullable(),
  tourId: z.number().nullable(),
  tourName: z.string().nullable(),
  tourColor: z.string().nullable(),
  customer: z.object({
    id: z.number(),
    customerNumber: z.string(),
    fullName: z.string().nullable(),
    company: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
  }),
  employees: z.array(
    z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      fullName: z.string(),
    }),
  ),
  customerNotesCount: z.number().int().min(0),
  projectNotesCount: z.number().int().min(0),
  appointmentNotesCount: z.number().int().min(0),
  customerAttachmentsCount: z.number().int().min(0),
  projectAttachmentsCount: z.number().int().min(0),
  appointmentAttachmentsCount: z.number().int().min(0),
  totalAttachmentsCount: z.number().int().min(0),
  appointmentTags: z.array(tagSchema),
  customerTags: z.array(tagSchema),
  projectTags: z.array(tagSchema),
  displayMode: z.enum(appointmentDisplayModes),
  isLocked: z.boolean(),
  isCancelled: z.boolean(),
});

const projectOrderResponseSchema = z.object({
  id: z.number().int().positive(),
  projectId: z.number().int().positive(),
  orderNumber: z.string(),
  amount: z.string().nullable(),
  plannedDateText: z.string().nullable(),
  plannedWeek: z.string().nullable(),
  version: z.number().int().min(1),
  createdAt: z.any(),
  updatedAt: z.any(),
});

const projectWithOrderSchema = z.custom<Project & { notesCount?: number; projectOrder?: ProjectOrder | null }>();
const projectWithOrderAndArticleItemsSchema = z.custom<Project & {
  notesCount?: number;
  projectOrder?: ProjectOrder | null;
  projectArticleItems: ProjectArticleItem[];
}>();
const projectListItemSchema = z.custom<Project & {
  notesCount?: number;
  projectOrder?: ProjectOrder | null;
  projectArticleItems?: ProjectArticleItem[];
  tags?: typeof tags.$inferSelect[];
}>();

const pagedListMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

const customerBoardListItemSchema = z.object({
  id: z.number(),
  customerNumber: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().nullable(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  version: z.number().int().min(1),
  notesCount: z.number().int().min(0),
  appointmentsCount: z.number().int().min(0),
  nextAppointmentStartDate: z.string().nullable(),
  nextAppointmentStartTimeHour: z.number().int().min(0).max(23).nullable(),
  nextAppointmentId: z.number().int().nullable(),
  tags: z.array(tagSchema),
  historicalAppointments: z.array(z.object({
    id: z.number(),
    startDate: z.string(),
    startTime: z.string().nullable(),
    orderNumber: z.string().nullable(),
    projectName: z.string(),
  })),
  attachmentsCount: z.number().int().min(0),
});

const projectBoardListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.number(),
  customerId: z.number(),
  descriptionMd: z.string().nullable(),
  isActive: z.boolean(),
  version: z.number().int().min(1),
  createdAt: z.any(),
  updatedAt: z.any(),
  orderNumber: z.string().nullable(),
  amount: z.string().nullable(),
  projectOrder: projectOrderResponseSchema.nullable(),
  notesCount: z.number().int().min(0),
  appointmentsCount: z.number().int().min(0),
  nextAppointmentStartDate: z.string().nullable(),
  nextAppointmentStartTimeHour: z.number().int().min(0).max(23).nullable(),
  projectArticleItems: z.array(projectArticleItemSchema),
  tags: z.array(tagSchema),
  customer: z.object({
    id: z.number(),
    customerNumber: z.string(),
    fullName: z.string().nullable(),
    lastName: z.string().nullable(),
    addressLine1: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  attachmentsCount: z.number().int().min(0),
});

const customerBoardListResponseSchema = pagedListMetaSchema.extend({
  items: z.array(customerBoardListItemSchema),
});

const projectBoardListResponseSchema = pagedListMetaSchema.extend({
  items: z.array(projectBoardListItemSchema),
});

const calendarWeekLaneEmployeePreviewMemberSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
});

const calendarWeekLaneEmployeePreviewSchema = z.object({
  date: z.string(),
  weekStartDate: z.string(),
  tourId: z.number().int().positive(),
  weekEmployees: z.array(calendarWeekLaneEmployeePreviewMemberSchema),
  additionalDayEmployees: z.array(calendarWeekLaneEmployeePreviewMemberSchema),
});

const calendarBlockedTourWeekSchema = z.object({
  tourId: z.number().int().positive(),
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  isBlocked: z.boolean(),
});

const calendarTourPostalPlanDayAppointmentSchema = z.object({
  id: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  projectName: z.string().nullable(),
  customerName: z.string().nullable(),
  postalCode: z.string().nullable(),
  displayMode: z.enum(appointmentDisplayModes),
  isCancelled: z.boolean(),
});

const calendarTourPostalPlanDaySchema = z.object({
  date: z.string(),
  appointments: z.array(calendarTourPostalPlanDayAppointmentSchema),
});

const calendarTourPostalPlanAppointmentSchema = z.object({
  id: z.number().int().positive(),
  version: z.number().int().min(1),
  projectId: z.number().int().positive().nullable(),
  projectName: z.string(),
  projectVersion: z.number().int().min(1).nullable(),
  projectOrderNumber: z.string().nullable(),
  projectArticleItems: z.array(projectArticleItemSchema),
  projectDescription: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  tourId: z.number().int().positive().nullable(),
  tourName: z.string().nullable(),
  tourColor: z.string().nullable(),
  customer: z.object({
    id: z.number().int().positive(),
    customerNumber: z.string(),
    fullName: z.string().nullable(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable().optional(),
  }),
  customerNotesCount: z.number().int().min(0),
  projectNotesCount: z.number().int().min(0),
  appointmentNotesCount: z.number().int().min(0),
  customerAttachmentsCount: z.number().int().min(0),
  projectAttachmentsCount: z.number().int().min(0),
  appointmentAttachmentsCount: z.number().int().min(0),
  totalAttachmentsCount: z.number().int().min(0),
  appointmentTags: z.array(tagSchema),
  customerTags: z.array(tagSchema),
  projectTags: z.array(tagSchema),
  displayMode: z.enum(appointmentDisplayModes),
  employees: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string(),
    }),
  ),
  isLocked: z.boolean(),
  isCancelled: z.boolean(),
});

const calendarTourPostalPlanSuggestionSchema = z.object({
  tourId: z.number().int().positive(),
  tourName: z.string(),
  tourColor: z.string().nullable(),
  score: z.number().int().min(1).max(5),
  scoreLabel: z.enum(["exakt", "sehr nah", "nah", "grob passend", "schwach passend"]),
  matchedPostalCodes: z.array(z.string()),
  matchedAppointmentCount: z.number().int().min(0),
  days: z.array(calendarTourPostalPlanDaySchema).length(7),
  appointments: z.array(calendarTourPostalPlanAppointmentSchema),
});

const calendarTourPostalPlanWeekSchema = z.object({
  isoYear: z.number().int().min(1),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  suggestions: z.array(calendarTourPostalPlanSuggestionSchema),
});

const appointmentMutationEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tour_changed"),
    appointmentId: z.number().int().positive(),
    previousTourId: z.number().int().positive().nullable(),
    nextTourId: z.number().int().positive().nullable(),
    previousTourName: z.string().nullable(),
    nextTourName: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("tag_mutated"),
    appointmentId: z.number().int().positive(),
    tagName: z.string().min(1),
    action: z.enum(["added", "removed"]),
  }),
]) as z.ZodType<AppointmentMutationEvent>;

const appointmentMutationResponseSchema = z.object({
  mutationEvents: z.array(appointmentMutationEventSchema).optional(),
});

const projectMutationEventSchema = z.object({
  kind: z.literal("tag_mutated"),
  projectId: z.number().int().positive(),
  tagName: z.string().min(1),
  action: z.enum(["added", "removed"]),
}) as z.ZodType<ProjectMutationEvent>;

const projectMutationResponseSchema = z.object({
  mutationEvents: z.array(projectMutationEventSchema).optional(),
});

const appointmentCancellationReportStateSchema = z.enum(["default", "contains_cancelled", "cancelled_only"]);

const reportVorlauflisteCategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

const reportVorlauflisteArticleValueSchema = z.object({
  categoryId: z.number().int().positive(),
  value: z.string().nullable(),
});

const reportVorlauflisteItemSchema = z.object({
  projectId: z.number().int().positive(),
  projectName: z.string(),
  isActive: z.boolean(),
  orderNumber: z.string().nullable(),
  customerId: z.number().int().positive(),
  customerNumber: z.string().nullable(),
  tags: z.array(tagSchema),
  highlightTag: tagSchema.nullable(),
  amount: z.string().nullable(),
  customerFullName: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  articleValues: z.array(reportVorlauflisteArticleValueSchema),
  plannedDateText: z.string().nullable(),
  plannedWeek: z.string().nullable(),
  actualDate: z.string(),
  projectDescription: z.string().nullable(),
  notesCount: z.number().int().min(0),
  plannedAppointmentsCount: z.number().int().min(0),
  attachmentsCount: z.number().int().min(0),
  reportState: appointmentCancellationReportStateSchema,
});

const reportVorlauflisteResponseSchema = pagedListMetaSchema.extend({
  productCategories: z.array(reportVorlauflisteCategorySchema),
  componentCategories: z.array(reportVorlauflisteCategorySchema),
  items: z.array(reportVorlauflisteItemSchema),
});

const reportVorlauflistePrintPreviewResponseSchema = z.object({
  productCategories: z.array(reportVorlauflisteCategorySchema),
  componentCategories: z.array(reportVorlauflisteCategorySchema),
  items: z.array(reportVorlauflisteItemSchema),
});

const reportProduktionsplanungItemTotalSchema = z.object({
  itemName: z.string().min(1),
  totalQuantity: z.number().int().min(0),
});

const reportProduktionsplanungCategoryGroupSchema = z.object({
  categoryId: z.number().int().positive(),
  categoryName: z.string().min(1),
  items: z.array(reportProduktionsplanungItemTotalSchema),
});

const reportProduktionsplanungProjectRowSchema = z.object({
  projectId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  appointmentId: z.number().int().positive(),
  projectName: z.string().min(1),
  orderNumber: z.string().nullable(),
  customerNumber: z.string().nullable(),
  customerFullName: z.string().nullable(),
  actualDate: z.string(),
  durationDays: z.number().int().min(1),
  tourName: z.string().nullable(),
  employees: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string().min(1),
    }),
  ),
  customerNotesCount: z.number().int().min(0),
  projectNotesCount: z.number().int().min(0),
  appointmentNotesCount: z.number().int().min(0),
  notesCount: z.number().int().min(0),
  customerAttachmentsCount: z.number().int().min(0),
  projectAttachmentsCount: z.number().int().min(0),
  appointmentAttachmentsCount: z.number().int().min(0),
  attachmentsCount: z.number().int().min(0),
  tags: z.array(tagSchema),
  reportCardReasonTags: z.array(tagSchema),
  articleValues: z.array(reportVorlauflisteArticleValueSchema),
  projectDescription: z.string().nullable(),
});

const reportProduktionsplanungResponseSchema = z.object({
  productCategoryGroups: z.array(reportProduktionsplanungCategoryGroupSchema),
  componentCategoryGroups: z.array(reportProduktionsplanungCategoryGroupSchema),
  projectRows: z.array(reportProduktionsplanungProjectRowSchema),
});

const reportAuftragslisteProjectRowSchema = z.object({
  projectId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  appointmentId: z.number().int().positive(),
  projectName: z.string().min(1),
  orderNumber: z.string().nullable(),
  customerNumber: z.string().nullable(),
  customerFullName: z.string().nullable(),
  actualDate: z.string(),
  durationDays: z.number().int().min(1),
  tourName: z.string().nullable(),
  tourColor: z.string().nullable(),
  employees: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string().min(1),
    }),
  ),
  customerNotesCount: z.number().int().min(0),
  projectNotesCount: z.number().int().min(0),
  appointmentNotesCount: z.number().int().min(0),
  notesCount: z.number().int().min(0),
  customerAttachmentsCount: z.number().int().min(0),
  projectAttachmentsCount: z.number().int().min(0),
  appointmentAttachmentsCount: z.number().int().min(0),
  attachmentsCount: z.number().int().min(0),
  tags: z.array(tagSchema),
  articleValues: z.array(reportVorlauflisteArticleValueSchema),
  projectDescription: z.string().nullable(),
});

const reportAuftragslisteResponseSchema = z.object({
  productCategories: z.array(reportVorlauflisteCategorySchema),
  componentCategories: z.array(reportVorlauflisteCategorySchema),
  availableSaunaModels: z.array(z.string().min(1)),
  items: z.array(reportAuftragslisteProjectRowSchema),
});

const reportConfigDefaultsResponseSchema = z.object({
  latestProjectAppointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

const authenticatedResponseSchema = z.object({
  status: z.literal("authenticated"),
  userId: z.number().int().positive(),
  username: z.string(),
  roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
});

const _changeNotificationEventSchema = z.object({
  id: z.number().int().positive(),
  actorUserId: z.number().int().positive().nullable(),
  triggerKey: z.string().nullable(),
  createdAt: z.string().min(1),
});

const monitoringItemSchema = z.object({
  appointmentId: z.number().int().positive(),
  startDate: z.string(),
  startTime: z.string().nullable(),
  tourId: z.number().int().positive().nullable(),
  tourName: z.string().nullable(),
  orderNumber: z.string().nullable(),
  projectTitle: z.string().nullable(),
  projectName: z.string().nullable(),
  customerNumber: z.string().nullable(),
  customerFirstName: z.string().nullable(),
  customerLastName: z.string().nullable(),
  customerName: z.string().nullable(),
  employeeCount: z.number().int().min(0),
  triggerCode: z.enum(MONITORING_TRIGGER_CODES),
  triggerCodes: z.array(z.enum(MONITORING_TRIGGER_CODES)).min(1),
  triggerName: z.string().min(1),
});

const monitoringTriggerConfigSchema = z.object({
  allAppointments: z.boolean(),
  horizonDays: z.number().int().min(1),
  minimumEmployees: z.number().int().min(1),
}).strict();

const monitoringConfigResponseSchema = z.object({
  tr01: monitoringTriggerConfigSchema,
});

const tourPrintPreviewNoteSchema = z.object({
  id: z.number().int().positive(),
  sourceType: z.enum(["customer", "project", "appointment"]),
  title: z.string(),
  body: z.string().nullable(),
  cardColor: z.string().nullable(),
  print: z.boolean(),
  updatedAt: z.string(),
});

const tourPrintPreviewAppointmentSchema = z.object({
  id: z.number().int().positive(),
  projectId: z.number().nullable(),
  projectName: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  startTime: z.string().nullable(),
  durationDays: z.number().int().min(1),
  saunaModel: z.string().nullable(),
  customer: z.object({
    id: z.number().int().positive(),
    customerNumber: z.string(),
    fullName: z.string().nullable(),
    phone: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
  }),
  employees: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string(),
    }),
  ),
  printNotes: z.array(tourPrintPreviewNoteSchema),
  appointmentTags: z.array(tagSchema),
  customerTags: z.array(tagSchema),
  projectTags: z.array(tagSchema),
});

const tourPrintPreviewResponseSchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  weeks: z.array(
    z.object({
      weekStart: z.string(),
      weekEnd: z.string(),
      weekNotes: z.array(tourPrintPreviewNoteSchema),
    }),
  ),
  tour: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    color: z.string(),
  }),
  appointments: z.array(tourPrintPreviewAppointmentSchema),
});

const attachmentDuplicateHitSchema = z.object({
  domain: z.enum(["customer", "project", "employee", "appointment"]),
  attachmentId: z.number().int().positive(),
  ownerId: z.number().int().positive(),
  ownerLabel: z.string(),
  originalName: z.string(),
  createdAt: z.string(),
});

const customerProjectAttachmentGroupSchema = z.object({
  projectId: z.number().int().positive(),
  projectName: z.string(),
  attachments: z.array(z.custom<typeof projectAttachments.$inferSelect>()),
});

const appointmentAttachmentContextSchema = z.object({
  appointmentId: z.number().int().positive(),
  project: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    orderNumber: z.string().nullable(),
  }).nullable(),
  customer: z.object({
    id: z.number().int().positive(),
    customerNumber: z.string(),
    fullName: z.string().nullable(),
  }),
  projectAttachments: z.array(z.custom<typeof projectAttachments.$inferSelect>()),
  customerAttachments: z.array(z.custom<typeof customerAttachments.$inferSelect>()),
  appointmentAttachments: z.array(z.custom<typeof appointmentAttachments.$inferSelect>()),
});

const bulkImportCustomerAnalyzeItemSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  customerNumber: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
});

const bulkImportCustomerDuplicateItemSchema = bulkImportCustomerAnalyzeItemSchema.extend({
  existingCustomerId: z.number().int().positive(),
});

const bulkImportProjectAnalyzeItemSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  orderNumber: z.string(),
  title: z.string(),
  customerNumber: z.string(),
  customerName: z.string().nullable(),
  articleListHtml: z.string(),
});

const bulkImportProjectDuplicateItemSchema = bulkImportProjectAnalyzeItemSchema.extend({
  existingProjectId: z.number().int().positive(),
});

const bulkImportProjectSpecialItemSchema = bulkImportProjectAnalyzeItemSchema.extend({
  extractedCustomer: extractedCustomerSchema,
});

const masterDataMiningArticleItemSchema = z.object({
  kind: z.enum(["product", "component"]),
  quantity: z.string().min(1),
  articleNumber: z.string().nullable(),
  name: z.string().min(1),
  description: z.string().nullable(),
});

const masterDataMiningDocumentSchema = z.object({
  fileName: z.string().min(1),
  orderNumber: z.string().nullable(),
  productName: z.string().min(1),
  productDescription: z.string().nullable(),
  articleItems: z.array(masterDataMiningArticleItemSchema).min(1),
});

const masterDataMiningProductGroupSchema = z.object({
  productName: z.string().min(1),
  productDescription: z.string().nullable(),
  sourceFileNames: z.array(z.string().min(1)).min(1),
  articleItems: z.array(masterDataMiningArticleItemSchema),
});

const masterDataMiningSkippedDocumentSchema = z.object({
  fileName: z.string().min(1),
  reason: z.string().min(1),
});

const bulkImportLimitsSchema = z.object({
  maxFiles: z.number().int().positive(),
  maxFileSizeBytes: z.number().int().positive(),
  maxTotalBytes: z.number().int().positive(),
});


const masterDataCategoryImportSummarySchema = z.object({
  totalRows: z.number().int().min(0),
  createdRows: z.number().int().min(0),
  updatedRows: z.number().int().min(0),
  reactivatedRows: z.number().int().min(0),
  invalidRows: z.number().int().min(0),
  errorRows: z.number().int().min(0),
});

const masterDataCategoryImportRowSchema = z.object({
  lineNumber: z.number().int().min(1),
  name: z.string(),
  status: z.enum(["CREATED", "UPDATED", "REACTIVATED", "INVALID", "ERROR"]),
  message: z.string(),
});

const masterDataCategoryImportResponseSchema = z.object({
  summary: masterDataCategoryImportSummarySchema,
  rows: z.array(masterDataCategoryImportRowSchema),
});

export const api = {
  auth: {
    setupStatus: {
      method: "GET" as const,
      path: "/api/auth/setup-status",
      responses: {
        200: z.object({
          needsAdminSetup: z.boolean(),
          isTwoFactorEnabled: z.boolean(),
        }),
      },
    },
    sessionStatus: {
      method: "GET" as const,
      path: "/api/auth/session",
      responses: {
        200: authenticatedResponseSchema,
        401: z.object({ code: z.literal("UNAUTHORIZED") }),
      },
    },
    setupAdmin: {
      method: "POST" as const,
      path: "/api/auth/setup-admin",
      input: z
        .object({
          username: z.string().min(1).max(100),
          password: z.string().min(10).max(255),
        })
        .strict(),
      responses: {
        201: authenticatedResponseSchema.extend({
          roleCode: z.literal("ADMIN"),
        }),
        409: z.object({ code: z.enum(["SETUP_ALREADY_COMPLETED", "SETUP_REQUIRED"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z
        .object({
          username: z.string().min(1).max(100),
          password: z.string().min(1).max(255),
        })
        .strict(),
      responses: {
        200: z.union([
          authenticatedResponseSchema,
          z.object({
            status: z.literal("2fa_setup_required"),
            username: z.string(),
            manualEntryKey: z.string(),
            qrCodeDataUrl: z.string(),
          }),
          z.object({
            status: z.literal("2fa_required"),
            username: z.string(),
          }),
        ]),
        401: z.object({ code: z.literal("INVALID_CREDENTIALS") }),
        403: z.object({ code: z.literal("USER_INACTIVE") }),
        409: z.object({ code: z.literal("SETUP_REQUIRED") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    twoFactorSetupVerify: {
      method: "POST" as const,
      path: "/api/auth/2fa/setup/verify",
      input: z.object({
        code: z.string().min(1).max(20),
      }).strict(),
      responses: {
        200: authenticatedResponseSchema,
        401: z.object({ code: z.literal("INVALID_TWO_FACTOR_CODE") }),
        409: z.object({ code: z.literal("TWO_FACTOR_CHALLENGE_MISSING") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    twoFactorVerify: {
      method: "POST" as const,
      path: "/api/auth/2fa/verify",
      input: z.object({
        code: z.string().min(1).max(20),
      }).strict(),
      responses: {
        200: authenticatedResponseSchema,
        401: z.object({ code: z.literal("INVALID_TWO_FACTOR_CODE") }),
        409: z.object({ code: z.literal("TWO_FACTOR_CHALLENGE_MISSING") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    quickLoginTargets: {
      method: "GET" as const,
      path: "/api/auth/quick-login-targets",
      responses: {
        200: z.object({
          roles: z.array(
            z.object({
              roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
              available: z.boolean(),
              username: z.string().optional(),
            }),
          ),
        }),
        404: z.object({ code: z.literal("QUICK_LOGIN_DISABLED") }),
        409: z.object({ code: z.literal("SETUP_REQUIRED") }),
      },
    },
    quickLogin: {
      method: "POST" as const,
      path: "/api/auth/quick-login",
      input: z
        .object({
          roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
        })
        .strict(),
      responses: {
        200: authenticatedResponseSchema,
        404: z.object({ code: z.enum(["QUICK_LOGIN_DISABLED", "USER_NOT_FOUND_FOR_ROLE"]) }),
        409: z.object({ code: z.enum(["SETUP_REQUIRED", "TWO_FACTOR_REQUIRED"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.object({ ok: z.literal(true) }),
      },
    },
  },
  documentExtraction: {
    extract: {
      method: "POST" as const,
      path: "/api/document-extraction/extract",
      input: z.object({
        scope: extractionScopeSchema,
      }).strict(),
        responses: {
          200: z.object({
            customer: extractedCustomerSchema,
            orderNumber: z.string().nullable(),
            amount: z.string().nullable(),
            saunaModel: z.string().min(1),
            articleItems: z.array(extractedArticleItemSchema),
            categorizedItems: z.array(extractedArticleCategorySchema),
            articleListHtml: z.string().min(1),
            fieldReport: extractedFieldReportSchema,
            warnings: z.array(z.string()),
        }),
        400: errorSchemas.validation,
        409: z.object({
          code: z.literal("ORDER_NUMBER_ALREADY_IMPORTED"),
          message: z.string(),
        }),
        422: errorSchemas.validation,
      },
    },
    checkCustomerDuplicate: {
      method: "POST" as const,
      path: "/api/document-extraction/check-customer-duplicate",
      input: z.object({
        customerNumber: z.string().min(1),
      }).strict(),
      responses: {
        200: z.object({
          duplicate: z.boolean(),
          count: z.number().int().min(0),
        }),
        400: errorSchemas.validation,
      },
    },
    resolveCustomerByNumber: {
      method: "POST" as const,
      path: "/api/document-extraction/resolve-customer-by-number",
      input: z.object({
        customerNumber: z.string().min(1),
      }).strict(),
      responses: {
        200: z.object({
          resolution: z.enum(["none", "single", "multiple"]),
          count: z.number().int().min(0),
          customer: z.custom<typeof customers.$inferSelect>().nullable(),
        }),
        400: errorSchemas.validation,
      },
    },
    resolveProjectByOrderNumber: {
      method: "POST" as const,
      path: "/api/document-extraction/resolve-project-by-order-number",
      input: z.object({
        orderNumber: z.string().min(1),
      }).strict(),
      responses: {
        200: z.object({
          resolution: z.enum(["none", "single", "multiple"]),
          count: z.number().int().min(0),
          project: z.custom<Project>().nullable(),
          latestAppointment: documentExtractionLatestProjectAppointmentSchema.nullable(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  journal: {
    list: {
      method: "GET" as const,
      path: "/api/journal/messages",
      input: journalListInputSchema,
      responses: {
        200: journalListResponseSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  appointments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments/list',
      input: z.object({
        employeeId: z.coerce.number().int().positive().optional(),
        projectId: z.coerce.number().int().positive().optional(),
        customerId: z.coerce.number().int().positive().optional(),
        projectTitle: z.string().trim().optional(),
        customerLastName: z.string().trim().optional(),
        customerNumber: z.string().trim().optional(),
        orderNumber: z.string().trim().optional(),
        tagIds: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional(),
        tourId: z.coerce.number().int().positive().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        allDayOnly: z
          .union([z.boolean(), z.literal("true"), z.literal("false")])
          .transform((value) => (value === true || value === "true"))
          .optional(),
        withStartTimeOnly: z
          .union([z.boolean(), z.literal("true"), z.literal("false")])
          .transform((value) => (value === true || value === "true"))
          .optional(),
        singleEmployeeOnly: z
          .union([z.boolean(), z.literal("true"), z.literal("false")])
          .transform((value) => (value === true || value === "true"))
          .optional(),
        lockedOnly: z
          .union([z.boolean(), z.literal("true"), z.literal("false")])
          .transform((value) => (value === true || value === "true"))
          .optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(25),
      }).strict(),
      responses: {
        200: z.object({
          page: z.number().int().min(1),
          pageSize: z.number().int().min(1),
          total: z.number().int().min(0),
          totalPages: z.number().int().min(0),
          focusAppointment: z.object({
            appointmentId: z.number().int().min(1),
            page: z.number().int().min(1),
            indexOnPage: z.number().int().min(0),
            startDate: z.string(),
            startTime: z.string().nullable(),
          }).nullable(),
          availableRange: z.object({
            dateFrom: z.string().nullable(),
            dateTo: z.string().nullable(),
          }),
          items: z.array(
            z.object({
              id: z.number(),
              projectId: z.number().nullable(),
              projectName: z.string(),
              projectVersion: z.number().int().min(1).nullable(),
              projectOrderNumber: z.string().nullable(),
              projectArticleItems: z.array(projectArticleItemSchema),
              projectDescription: z.string().nullable(),
              startDate: z.string(),
              endDate: z.string().nullable(),
              startTime: z.string().nullable(),
              startTimeHour: z.number().int().min(0).max(23).nullable(),
              tourId: z.number().nullable(),
              tourName: z.string().nullable(),
              tourColor: z.string().nullable(),
              customer: z.object({
                id: z.number(),
                customerNumber: z.string(),
                fullName: z.string().nullable(),
                company: z.string().nullable(),
                phone: z.string().nullable(),
                email: z.string().nullable(),
                addressLine1: z.string().nullable(),
                addressLine2: z.string().nullable(),
                postalCode: z.string().nullable(),
                city: z.string().nullable(),
                country: z.string().nullable(),
              }),
              employees: z.array(
                z.object({
                  id: z.number(),
                  fullName: z.string(),
                }),
              ),
              customerNotesCount: z.number().int().min(0),
              projectNotesCount: z.number().int().min(0),
              appointmentNotesCount: z.number().int().min(0),
              customerAttachmentsCount: z.number().int().min(0),
              projectAttachmentsCount: z.number().int().min(0),
              appointmentAttachmentsCount: z.number().int().min(0),
              totalAttachmentsCount: z.number().int().min(0),
              appointmentTags: z.array(tagSchema),
              customerTags: z.array(tagSchema),
              projectTags: z.array(tagSchema),
              displayMode: z.enum(appointmentDisplayModes),
              isLocked: z.boolean(),
              isCancelled: z.boolean(),
              allDay: z.boolean(),
              singleEmployee: z.boolean(),
            }),
          ),
        }),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/appointments/:id',
      responses: {
        200: z.object({
          id: z.number(),
          version: z.number().int().min(1),
          projectId: z.number().nullable(),
          customerId: z.number(),
          tourId: z.number().nullable(),
          displayMode: z.enum(appointmentDisplayModes),
          title: z.string(),
          description: z.string().nullable(),
          startDate: z.string(),
          startTime: z.string().nullable(),
          endDate: z.string().nullable(),
          endTime: z.string().nullable(),
          employees: z.array(z.custom<typeof employees.$inferSelect>()),
          isCancelled: z.boolean(),
        }).extend(appointmentTagGroupsSchema.shape),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments',
      input: z.object({
        projectId: z.number().nullable().optional(),
        customerId: z.number().optional(),
        tourId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string().nullable().optional(),
        startTime: z.string().nullable().optional(),
        employeeIds: z.array(z.number()).optional(),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          projectId: z.number().nullable(),
          customerId: z.number(),
          tourId: z.number().nullable(),
          displayMode: z.enum(appointmentDisplayModes),
          title: z.string(),
          description: z.string().nullable(),
          startDate: z.string(),
          startTime: z.string().nullable(),
          endDate: z.string().nullable(),
          endTime: z.string().nullable(),
          employees: z.array(z.custom<typeof employees.$inferSelect>()),
        }).extend(appointmentMutationResponseSchema.shape),
        409: z.object({
          code: z.enum([
            "EMPLOYEE_OVERLAP_CONFLICT",
            "INACTIVE_ENTITY_ASSIGNMENT",
            "PAST_APPOINTMENT_READONLY",
          ]),
          message: z.string().optional(),
          conflictEmployees: z.array(z.object({
            id: z.number().int().positive(),
            fullName: z.string(),
          })).optional(),
        }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id',
      input: z.object({
        version: z.number().int().min(1),
        projectId: z.number().nullable().optional(),
        customerId: z.number().optional(),
        tourId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string().nullable().optional(),
        startTime: z.string().nullable().optional(),
        employeeIds: z.array(z.number()).optional(),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          projectId: z.number().nullable(),
          customerId: z.number(),
          tourId: z.number().nullable(),
          displayMode: z.enum(appointmentDisplayModes),
          title: z.string(),
          description: z.string().nullable(),
          startDate: z.string(),
          startTime: z.string().nullable(),
          endDate: z.string().nullable(),
          endTime: z.string().nullable(),
          employees: z.array(z.custom<typeof employees.$inferSelect>()),
        }).extend(appointmentMutationResponseSchema.shape),
        403: z.object({ code: z.literal("PAST_APPOINTMENT_READONLY") }),
        404: errorSchemas.notFound,
        409: z.object({
          code: z.enum([
            "VERSION_CONFLICT",
            "EMPLOYEE_OVERLAP_CONFLICT",
            "INACTIVE_ENTITY_ASSIGNMENT",
            "PAST_APPOINTMENT_READONLY",
            "CANCELLED_APPOINTMENT_READONLY",
          ]),
          message: z.string().optional(),
          conflictEmployees: z.array(z.object({
            id: z.number().int().positive(),
            fullName: z.string(),
          })).optional(),
        }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/appointments/:id',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("PAST_APPOINTMENT_READONLY") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLED_APPOINTMENT_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    setDisplayMode: {
      method: "PATCH" as const,
      path: "/api/appointments/:id/display-mode",
      input: z.object({
        version: z.number().int().min(1),
        displayMode: z.enum(appointmentDisplayModes),
      }).strict(),
      responses: {
        200: z.object({
          id: z.number(),
          version: z.number().int().min(1),
          displayMode: z.enum(appointmentDisplayModes),
        }),
        403: z.object({ code: z.literal("PAST_APPOINTMENT_READONLY") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLED_APPOINTMENT_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    cancel: {
      method: "POST" as const,
      path: "/api/appointments/:id/cancel",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLATION_TAG_NOT_CONFIGURED"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    park: {
      method: "POST" as const,
      path: "/api/appointments/:id/park",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLED_APPOINTMENT_READONLY", "ALREADY_PARKED", "BUSINESS_CONFLICT"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    reklamation: {
      set: {
        method: "POST" as const,
        path: "/api/appointments/:id/reklamation",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: projectMutationResponseSchema.extend({ kind: z.enum(["updated", "noop"]) }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLED_APPOINTMENT_READONLY", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      remove: {
        method: "DELETE" as const,
        path: "/api/appointments/:id/reklamation",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: projectMutationResponseSchema.extend({ kind: z.enum(["updated", "noop"]) }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLED_APPOINTMENT_READONLY", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    tourChangePreview: {
      method: "POST" as const,
      path: "/api/appointments/:id/tour-change-preview",
      input: appointmentTourChangePreviewInputSchema,
      responses: {
        200: appointmentWeekEmployeePreviewResponseSchema,
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("PAST_APPOINTMENT_READONLY") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  appointmentTags: {
    list: {
      method: "GET" as const,
      path: "/api/appointments/:appointmentId/tags",
      responses: {
        200: z.array(tagRelationItemSchema),
        404: errorSchemas.notFound,
      },
    },
    add: {
      method: "POST" as const,
      path: "/api/appointments/:appointmentId/tags",
      input: z.object({
        tagId: z.number().int().positive(),
      }).strict(),
      responses: {
        201: tagRelationItemSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["PAST_APPOINTMENT_READONLY", "WORKFLOW_TAG_PROTECTED", "CANCELLED_APPOINTMENT_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    remove: {
      method: "DELETE" as const,
      path: "/api/appointments/:appointmentId/tags/:tagId",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "WORKFLOW_TAG_PROTECTED", "CANCELLED_APPOINTMENT_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  appointmentEmployees: {
    remove: {
      method: "DELETE" as const,
      path: "/api/appointments/:id/employees/:employeeId",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLED_APPOINTMENT_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  appointmentNotes: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments/:appointmentId/notes',
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments/:appointmentId/notes',
      input: insertNoteSchema.extend({ templateId: z.number().optional() }),
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/appointments/:appointmentId/notes/:noteId',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.union([z.literal("VERSION_CONFLICT"), z.literal("BUSINESS_CONFLICT")]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  calendarAppointments: {
    list: {
      method: "GET" as const,
      path: "/api/calendar/appointments",
      input: z.object({
        fromDate: z.string(),
        toDate: z.string(),
        employeeId: z.union([z.string(), z.number()]).optional(),
        detail: z.enum(["compact", "full"]).optional(),
      }).strict(),
      responses: {
        200: z.array(
          z.object({
            id: z.number(),
            version: z.number().int().min(1),
            projectId: z.number().nullable(),
            projectName: z.string(),
            projectVersion: z.number().int().min(1).nullable(),
            projectOrderNumber: z.string().nullable(),
            projectArticleItems: z.array(projectArticleItemSchema),
            projectDescription: z.string().nullable(),
            startDate: z.string(),
            endDate: z.string().nullable(),
            startTime: z.string().nullable(),
            tourId: z.number().nullable(),
            tourName: z.string().nullable(),
            tourColor: z.string().nullable(),
            customer: z.object({
              id: z.number(),
              customerNumber: z.string(),
              fullName: z.string().nullable(),
              company: z.string().nullable().optional(),
              phone: z.string().nullable().optional(),
              email: z.string().nullable().optional(),
              addressLine1: z.string().nullable().optional(),
              addressLine2: z.string().nullable().optional(),
              postalCode: z.string().nullable(),
              city: z.string().nullable(),
              country: z.string().nullable().optional(),
            }),
            project: z.object({
              id: z.number(),
              customerId: z.number(),
              name: z.string(),
              orderNumber: z.string().nullable(),
              descriptionMd: z.string().nullable(),
              isActive: z.boolean(),
            }).nullable().optional(),
            customerNotesCount: z.number().int().min(0),
            projectNotesCount: z.number().int().min(0),
            appointmentNotesCount: z.number().int().min(0),
            customerAttachmentsCount: z.number().int().min(0),
            projectAttachmentsCount: z.number().int().min(0),
            appointmentAttachmentsCount: z.number().int().min(0),
            totalAttachmentsCount: z.number().int().min(0),
            appointmentTags: z.array(tagSchema),
            customerTags: z.array(tagSchema),
            projectTags: z.array(tagSchema),
            displayMode: z.enum(appointmentDisplayModes),
            employees: z.array(
              z.object({
                id: z.number(),
                fullName: z.string(),
              }),
            ),
            isLocked: z.boolean(),
            isCancelled: z.boolean(),
          }),
        ),
      },
    },
    weekLaneEmployeePreviews: {
      method: "GET" as const,
      path: "/api/calendar/week-lane-employee-previews",
      input: z.object({
        fromDate: z.string(),
        toDate: z.string(),
      }).strict(),
      responses: {
        200: z.array(calendarWeekLaneEmployeePreviewSchema),
      },
    },
    blockedTourWeeks: {
      method: "GET" as const,
      path: "/api/calendar/blocked-tour-weeks",
      input: z.object({
        fromDate: z.string(),
        toDate: z.string(),
      }).strict(),
      responses: {
        200: z.array(calendarBlockedTourWeekSchema),
      },
    },
    tourPostalPlan: {
      method: "GET" as const,
      path: "/api/calendar/tour-postal-plan",
      input: z.object({
        postalCode: z.string().min(1),
        fromDate: z.string(),
        toDate: z.string(),
        hasFreeAppointments: z
          .union([z.literal("true"), z.literal("false")])
          .optional(),
      }).strict(),
      responses: {
        200: z.array(calendarTourPostalPlanWeekSchema),
      },
    },
  },
  calendarMarkers: {
    list: {
      method: "GET" as const,
      path: "/api/calendar/markers",
      input: z.object({
        fromDate: dateOnlySchema,
        toDate: dateOnlySchema,
      }).strict(),
      responses: {
        200: z.array(calendarMarkerSchema),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    adminList: {
      method: "GET" as const,
      path: "/api/admin/calendar-markers",
      responses: {
        200: z.array(calendarMarkerSchema),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/admin/calendar-markers",
      input: calendarMarkerWriteSchema,
      responses: {
        201: calendarMarkerSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        503: z.object({ code: z.literal("STORAGE_NOT_WRITABLE") }),
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/admin/calendar-markers/:id",
      input: calendarMarkerUpdateSchema,
      responses: {
        200: calendarMarkerSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: z.object({ code: z.literal("NOT_FOUND") }),
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        503: z.object({ code: z.literal("STORAGE_NOT_WRITABLE") }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/admin/calendar-markers/:id",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: z.object({ code: z.literal("NOT_FOUND") }),
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        503: z.object({ code: z.literal("STORAGE_NOT_WRITABLE") }),
      },
    },
  },
  tours: {
    list: {
      method: 'GET' as const,
      path: '/api/tours',
      responses: {
        200: z.array(z.custom<typeof tours.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tours',
      input: insertTourSchema,
      responses: {
        201: z.custom<typeof tours.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tours/:id',
      input: updateTourSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof tours.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tours/:id',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  teams: {
    list: {
      method: 'GET' as const,
      path: '/api/teams',
      responses: {
        200: z.array(z.custom<typeof teams.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/teams',
      input: insertTeamSchema,
      responses: {
        201: z.custom<typeof teams.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/teams/:id',
      input: updateTeamSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof teams.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/teams/:id',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  tags: {
    list: {
      method: "GET" as const,
      path: "/api/tags",
      input: z.object({
        domain: tagPickerDomainSchema.default("appointment"),
      }).strict(),
      responses: {
        200: z.array(tagSchema),
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      input: z.object({
        scope: z.enum(["active", "inactive"]).default("active"),
        tagIds: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional(),
      }).strict(),
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect & { notesCount: number; tags: typeof tags.$inferSelect[] }>()),
      },
    },
    pagedList: {
      method: 'GET' as const,
      path: '/api/customers/list',
      input: z.object({
        scope: z.enum(["active", "inactive"]).default("active"),
        lastName: z.string().trim().optional(),
        customerNumber: z.string().trim().optional(),
        tagIds: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      }).strict(),
      responses: {
        200: customerBoardListResponseSchema,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id',
      responses: {
        200: z.custom<typeof customers.$inferSelect & { tags: typeof tags.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers',
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
        409: z.object({ code: z.literal("CUSTOMER_NUMBER_CONFLICT") }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customers/:id',
      input: updateCustomerSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    appointments: {
      list: {
        method: 'GET' as const,
        path: '/api/customers/:id/appointments',
        input: entityAppointmentsQuerySchema,
        responses: {
          200: z.array(entityAppointmentItemSchema),
        },
      },
    },
  },
  customerTags: {
    list: {
      method: "GET" as const,
      path: "/api/customers/:customerId/tags",
      responses: {
        200: z.array(tagRelationItemSchema),
        404: errorSchemas.notFound,
      },
    },
    add: {
      method: "POST" as const,
      path: "/api/customers/:customerId/tags",
      input: z.object({
        tagId: z.number().int().positive(),
      }).strict(),
      responses: {
        201: tagRelationItemSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("WORKFLOW_TAG_PROTECTED") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    remove: {
      method: "DELETE" as const,
      path: "/api/customers/:customerId/tags/:tagId",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "WORKFLOW_TAG_PROTECTED"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  customerNotes: {
    list: {
      method: 'GET' as const,
      path: '/api/customers/:customerId/notes',
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers/:customerId/notes',
      input: insertNoteSchema.extend({ templateId: z.number().optional() }),
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:customerId/notes/:noteId',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  notes: {
    update: {
      method: 'PUT' as const,
      path: '/api/notes/:noteId',
      input: updateNoteSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof notes.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    togglePin: {
      method: 'PATCH' as const,
      path: '/api/notes/:noteId/pin',
      input: z.object({
        isPinned: z.boolean(),
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof notes.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  noteTemplates: {
    list: {
      method: 'GET' as const,
      path: '/api/note-templates',
      responses: {
        200: z.array(z.custom<typeof noteTemplates.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/note-templates',
      input: insertNoteTemplateSchema,
      responses: {
        201: z.custom<typeof noteTemplates.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/note-templates/:id',
      input: updateNoteTemplateSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof noteTemplates.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/note-templates/:id',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  // Employees API (FT 05 - Mitarbeiterverwaltung)
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees',
      input: z.object({
        scope: z.enum(["active", "inactive"]).default("active"),
        appointmentDate: z.string().optional(),
      }).strict(),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect & {
          tags: typeof tags.$inferSelect[];
          notesCount: number;
          attachmentsCount: number;
        }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/employees/:id',
      responses: {
        200: z.object({
          employee: z.custom<typeof employees.$inferSelect>(),
          team: z.custom<typeof teams.$inferSelect>().nullable(),
          tour: z.custom<typeof tours.$inferSelect>().nullable(),
        }),
        404: errorSchemas.notFound,
      },
    },
    weekPlans: {
      method: 'GET' as const,
      path: '/api/employees/:id/week-plans',
      responses: {
        200: z.array(employeeWeekPlanningItemSchema),
        404: errorSchemas.notFound,
      },
    },
    revenueOverview: {
      method: "GET" as const,
      path: "/api/employees/:id/revenue-overview",
      responses: {
        200: employeeRevenueOverviewResponseSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees',
      input: insertEmployeeSchema,
      responses: {
        201: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    importCsv: {
      method: "POST" as const,
      path: "/api/employees/import-csv",
      responses: {
        200: z.object({
          summary: z.object({
            totalRows: z.number().int().min(0),
            importedRows: z.number().int().min(0),
            duplicateRows: z.number().int().min(0),
            invalidRows: z.number().int().min(0),
            errorRows: z.number().int().min(0),
          }),
          rows: z.array(
            z.object({
              lineNumber: z.number().int().min(1),
              firstName: z.string(),
              lastName: z.string(),
              status: z.enum(["IMPORTED", "DUPLICATE", "INVALID", "ERROR"]),
              message: z.string(),
            }),
          ),
        }),
        400: z.object({ code: z.literal("INVALID_CSV_HEADER") }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        413: z.object({ code: z.literal("PAYLOAD_TOO_LARGE") }),
        422: z.object({ code: z.enum(["INVALID_CSV_FORMAT", "INVALID_CSV_CONTENT"]) }),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/employees/:id',
      input: updateEmployeeSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    toggleActive: {
      method: 'PATCH' as const,
      path: '/api/employees/:id/active',
      input: z.object({
        isActive: z.boolean(),
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/employees/:id",
      input: z.object({}).passthrough().optional(),
      responses: {
        405: z.object({ code: z.literal("METHOD_NOT_ALLOWED") }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    currentAppointments: {
      method: 'GET' as const,
      path: '/api/employees/:id/current-appointments',
      responses: {
        200: z.array(entityAppointmentItemSchema),
      },
    },
    appointments: {
      list: {
        method: 'GET' as const,
        path: '/api/employees/:id/appointments',
        input: entityAppointmentsQuerySchema,
        responses: {
          200: z.array(entityAppointmentItemSchema),
        },
      },
    },
    absenceAppointments: {
      list: {
        method: "GET" as const,
        path: "/api/employees/:id/absence-appointments",
        responses: {
          200: z.array(entityAppointmentItemSchema),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/employees/:id/absence-appointments",
        input: employeeAppointmentAbsenceInputSchema,
        responses: {
          201: entityAppointmentItemSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.string(), message: z.string().optional() }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/employees/:id/absence-appointments/:appointmentId",
        input: employeeAppointmentAbsenceInputSchema.extend({
          version: z.number().int().min(1),
        }),
        responses: {
          200: entityAppointmentItemSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.string(), message: z.string().optional() }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/employees/:id/absence-appointments/:appointmentId",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.string(), message: z.string().optional() }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
  },
  employeeNotes: {
    list: {
      method: "GET" as const,
      path: "/api/employees/:employeeId/notes",
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/employees/:employeeId/notes",
      input: insertNoteSchema.extend({ templateId: z.number().optional() }),
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/employees/:employeeId/notes/:noteId",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  employeeTags: {
    list: {
      method: "GET" as const,
      path: "/api/employees/:employeeId/tags",
      responses: {
        200: z.array(tagRelationItemSchema),
        404: errorSchemas.notFound,
      },
    },
    add: {
      method: "POST" as const,
      path: "/api/employees/:employeeId/tags",
      input: z.object({
        tagId: z.number().int().positive(),
      }).strict(),
      responses: {
        201: tagRelationItemSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    remove: {
      method: "DELETE" as const,
      path: "/api/employees/:employeeId/tags/:tagId",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  users: {
    list: {
      method: "GET" as const,
      path: "/api/users",
      responses: {
        200: z.array(
          z.object({
            id: z.number().int().positive(),
            version: z.number().int().min(1),
            username: z.string(),
            email: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            fullName: z.string(),
            isActive: z.boolean(),
            hasTwoFactorSecret: z.boolean(),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]).nullable(),
            roleName: z.string().nullable(),
          }),
        ),
        403: errorSchemas.validation,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/users",
      input: z
        .object({
          username: z.string().min(1).max(100),
          email: z.string().email(),
          firstName: z.string().min(1).max(100),
          lastName: z.string().min(1).max(100),
          roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
          password: z.string().min(10).max(255),
        })
        .strict(),
      responses: {
        201: z.array(
          z.object({
            id: z.number().int().positive(),
            version: z.number().int().min(1),
            username: z.string(),
            email: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            fullName: z.string(),
            isActive: z.boolean(),
            hasTwoFactorSecret: z.boolean(),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]).nullable(),
            roleName: z.string().nullable(),
          }),
        ),
        403: errorSchemas.validation,
        409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    patch: {
      method: "PATCH" as const,
      path: "/api/users/:id",
      input: z.object({
        username: z.string().min(1).max(100),
        email: z.string().email(),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
        isActive: z.boolean(),
        password: z.string().min(10).max(255).optional(),
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        200: z.array(
          z.object({
            id: z.number().int().positive(),
            version: z.number().int().min(1),
            username: z.string(),
            email: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            fullName: z.string(),
            isActive: z.boolean(),
            hasTwoFactorSecret: z.boolean(),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]).nullable(),
            roleName: z.string().nullable(),
          }),
        ),
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    resetTwoFactor: {
      method: "POST" as const,
      path: "/api/users/:id/reset-2fa",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        200: z.array(
          z.object({
            id: z.number().int().positive(),
            version: z.number().int().min(1),
            username: z.string(),
            email: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            fullName: z.string(),
            isActive: z.boolean(),
            hasTwoFactorSecret: z.boolean(),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]).nullable(),
            roleName: z.string().nullable(),
          }),
        ),
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  masterData: {
    productCategories: {
      list: {
        method: "GET" as const,
        path: "/api/admin/master-data/product-categories",
        input: z.object({
          active: activeScopeSchema.optional(),
        }).strict(),
        responses: {
          200: z.array(z.custom<typeof productCategories.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/master-data/product-categories",
        input: insertProductCategorySchema,
        responses: {
          201: z.custom<typeof productCategories.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/master-data/product-categories/:id",
        input: updateProductCategorySchema.extend({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: z.custom<typeof productCategories.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/product-categories/:id",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      importCsv: {
        method: "POST" as const,
        path: "/api/admin/master-data/product-categories/:id/import-csv",
        responses: {
          200: masterDataCategoryImportResponseSchema,
          400: z.object({ code: z.literal("INVALID_CSV_HEADER") }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          413: z.object({ code: z.literal("PAYLOAD_TOO_LARGE") }),
          422: z.object({ code: z.enum(["INVALID_CSV_FORMAT", "INVALID_CSV_CONTENT", "VALIDATION_ERROR"]) }),
        },
      },
      deleteProducts: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/product-categories/:id/products",
        input: z.object({}).strict(),
        responses: {
          200: z.object({ deletedCount: z.number(), skippedCount: z.number() }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    componentCategories: {
      list: {
        method: "GET" as const,
        path: "/api/admin/master-data/component-categories",
        input: z.object({
          active: activeScopeSchema.optional(),
        }).strict(),
        responses: {
          200: z.array(z.custom<typeof componentCategories.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/master-data/component-categories",
        input: insertComponentCategorySchema,
        responses: {
          201: z.custom<typeof componentCategories.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/master-data/component-categories/:id",
        input: updateComponentCategorySchema.extend({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: z.custom<typeof componentCategories.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/component-categories/:id",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      importCsv: {
        method: "POST" as const,
        path: "/api/admin/master-data/component-categories/:id/import-csv",
        responses: {
          200: masterDataCategoryImportResponseSchema,
          400: z.object({ code: z.literal("INVALID_CSV_HEADER") }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          413: z.object({ code: z.literal("PAYLOAD_TOO_LARGE") }),
          422: z.object({ code: z.enum(["INVALID_CSV_FORMAT", "INVALID_CSV_CONTENT", "VALIDATION_ERROR"]) }),
        },
      },
      deleteComponents: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/component-categories/:id/components",
        input: z.object({}).strict(),
        responses: {
          200: z.object({ deletedCount: z.number(), skippedCount: z.number() }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    products: {
      list: {
        method: "GET" as const,
        path: "/api/admin/master-data/products",
        input: z.object({
          active: activeScopeSchema.optional(),
        }).strict(),
        responses: {
          200: z.array(z.custom<typeof products.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/master-data/products",
        input: insertProductSchema,
        responses: {
          201: z.custom<typeof products.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/master-data/products/:id",
        input: updateProductSchema.extend({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: z.custom<typeof products.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/products/:id",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    components: {
      list: {
        method: "GET" as const,
        path: "/api/admin/master-data/components",
        input: z.object({
          active: activeScopeSchema.optional(),
        }).strict(),
        responses: {
          200: z.array(z.custom<typeof components.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/master-data/components",
        input: insertComponentSchema,
        responses: {
          201: z.custom<typeof components.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/master-data/components/:id",
        input: updateComponentSchema.extend({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: z.custom<typeof components.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/components/:id",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.union([
            z.object({ code: z.literal("VERSION_CONFLICT") }),
            z.object({
              code: z.literal("BUSINESS_CONFLICT"),
              projectOrderItemCount: z.number().int().nonnegative().optional(),
            }),
          ]),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    tags: {
      list: {
        method: "GET" as const,
        path: "/api/admin/master-data/tags",
        responses: {
          200: z.array(z.custom<typeof tags.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/master-data/tags",
        input: z.object({
          name: tagNameSchema,
          color: tagColorSchema,
        }).strict(),
        responses: {
          201: z.custom<typeof tags.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/master-data/tags/:id",
        input: z.object({
          version: z.number().int().min(1),
          name: tagNameSchema.optional(),
          color: tagColorSchema.optional(),
        }).strict(),
        responses: {
          200: z.custom<typeof tags.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/tags/:id",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
  },
  // Tour employees (for Tour/Team management)
  tourEmployees: {
    active: {
      method: "GET" as const,
      path: "/api/tours/:tourId/employees/active",
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    addPreview: {
      method: "POST" as const,
      path: "/api/tours/:tourId/employees/cascade-add/preview",
      input: tourEmployeeCascadePreviewInputSchema,
      responses: {
        200: z.array(tourEmployeeCascadePreviewItemSchema),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    addExecute: {
      method: "POST" as const,
      path: "/api/tours/:tourId/employees/cascade-add",
      input: tourEmployeeCascadeExecuteInputSchema,
      responses: {
        200: tourEmployeeCascadeExecuteResponseSchema,
        404: errorSchemas.notFound,
        409: tourEmployeeCascadeConflictResponseSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    removePreview: {
      method: "POST" as const,
      path: "/api/tours/:tourId/employees/cascade-remove/preview",
      input: tourEmployeeCascadePreviewInputSchema,
      responses: {
        200: z.array(tourEmployeeCascadePreviewItemSchema),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    removeExecute: {
      method: "POST" as const,
      path: "/api/tours/:tourId/employees/cascade-remove",
      input: tourEmployeeCascadeExecuteInputSchema,
      responses: {
        200: tourEmployeeCascadeExecuteResponseSchema,
        404: errorSchemas.notFound,
        409: tourEmployeeCascadeConflictResponseSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  tourWeekEmployees: {
    list: {
      method: "GET" as const,
      path: "/api/tours/:tourId/week-employees",
      responses: {
        200: z.array(tourWeekEmployeesWeekSchema),
        404: errorSchemas.notFound,
      },
    },
    available: {
      method: "GET" as const,
      path: "/api/tours/:tourId/week-employees/available",
      input: tourWeekAvailabilityInputSchema,
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    addPreview: {
      method: "POST" as const,
      path: "/api/tours/:tourId/week-employees/add/preview",
      input: tourWeekAddPreviewInputSchema,
      responses: {
        200: z.object({
          isoYear: z.number().int().min(1),
          isoWeek: z.number().int().min(1).max(53),
          weekStartDate: z.string(),
          weekEndDate: z.string(),
          employee: tourWeekEmployeeMemberSchema.omit({ assignmentId: true }),
          items: z.array(tourWeekAppointmentPreviewItemSchema),
        }),
        404: errorSchemas.notFound,
        409: tourWeekConflictResponseSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    addExecute: {
      method: "POST" as const,
      path: "/api/tours/:tourId/week-employees/add",
      input: tourWeekExecuteInputSchema,
      responses: {
        200: tourWeekExecuteResponseSchema,
        404: errorSchemas.notFound,
        409: tourWeekConflictResponseSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    removePreview: {
      method: "POST" as const,
      path: "/api/tours/:tourId/week-employees/remove/preview",
      input: tourWeekRemovePreviewInputSchema,
      responses: {
        200: z.object({
          assignmentId: z.number().int().positive(),
          isoYear: z.number().int().min(1),
          isoWeek: z.number().int().min(1).max(53),
          weekStartDate: z.string(),
          weekEndDate: z.string(),
          employee: tourWeekEmployeeMemberSchema,
          items: z.array(tourWeekAppointmentPreviewItemSchema),
        }),
        404: errorSchemas.notFound,
        409: tourWeekConflictResponseSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    removeExecute: {
      method: "DELETE" as const,
      path: "/api/tours/:tourId/week-employees/:assignmentId",
      input: tourWeekExecuteInputSchema.omit({ employeeId: true }),
      responses: {
        200: tourWeekExecuteResponseSchema,
        404: errorSchemas.notFound,
        409: tourWeekConflictResponseSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    tourAssignmentPreview: {
      method: "POST" as const,
      path: "/api/tours/:tourId/week-employees/assignment-preview",
      input: tourAssignmentPreviewInputSchema,
      responses: {
        200: appointmentWeekEmployeePreviewResponseSchema,
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  tourWeeks: {
    create: {
      method: "POST" as const,
      path: "/api/tours/:tourId/weeks",
      input: tourWeekCreateInputSchema,
      responses: {
        200: tourWeekSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["BUSINESS_CONFLICT", "PAST_WEEK_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    block: {
      method: "POST" as const,
      path: "/api/tours/:tourId/weeks/:isoYear/:isoWeek/block",
      responses: {
        200: tourWeekStatusMutationResponseSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["BUSINESS_CONFLICT", "PAST_WEEK_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    unblock: {
      method: "POST" as const,
      path: "/api/tours/:tourId/weeks/:isoYear/:isoWeek/unblock",
      responses: {
        200: tourWeekStatusMutationResponseSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["BUSINESS_CONFLICT", "PAST_WEEK_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  teamEmployees: {
    list: {
      method: 'GET' as const,
      path: '/api/teams/:teamId/employees',
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/teams/:teamId/employees/:employeeId',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    assign: {
      method: 'POST' as const,
      path: '/api/teams/:teamId/employees',
      input: z.object({
        items: z.array(
          z.object({
            employeeId: z.number().int().positive(),
            version: z.number().int().min(1),
          }),
        ),
      }),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  helpTexts: {
    exportYaml: {
      method: "GET" as const,
      path: "/api/help-texts/export-yaml",
      responses: {
        200: z.any(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    importYamlPreview: {
      method: "POST" as const,
      path: "/api/help-texts/import-yaml/preview",
      responses: {
        200: z.object({
          fileHash: z.string().min(1),
          summary: z.object({
            totalItems: z.number().int().min(0),
            createCount: z.number().int().min(0),
            silentOverwriteCount: z.number().int().min(0),
            conflictCount: z.number().int().min(0),
          }),
          conflicts: z.array(
            z.object({
              helpKey: z.string(),
              existingTitle: z.string(),
              existingBody: z.string().nullable(),
              importedTitle: z.string(),
              importedBody: z.string().nullable(),
            }),
          ),
        }),
        400: z.object({ code: z.literal("INVALID_IMPORT_FILE") }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        413: z.object({ code: z.literal("PAYLOAD_TOO_LARGE") }),
        422: z.object({ code: z.enum(["INVALID_IMPORT_FORMAT", "VALIDATION_ERROR"]) }),
      },
    },
    importYamlApply: {
      method: "POST" as const,
      path: "/api/help-texts/import-yaml/apply",
      responses: {
        200: z.object({
          createdCount: z.number().int().min(0),
          silentOverwrittenCount: z.number().int().min(0),
          decisionOverwrittenCount: z.number().int().min(0),
          skippedCount: z.number().int().min(0),
        }),
        400: z.object({ code: z.literal("INVALID_IMPORT_FILE") }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        409: z.object({ code: z.literal("FILE_HASH_MISMATCH") }),
        413: z.object({ code: z.literal("PAYLOAD_TOO_LARGE") }),
        422: z.object({ code: z.enum(["INVALID_IMPORT_FORMAT", "VALIDATION_ERROR"]) }),
      },
    },
    seedMissingFromFrontend: {
      method: "POST" as const,
      path: "/api/help-texts/seed-missing-from-frontend",
      responses: {
        200: z.object({
          scannedKeys: z.array(z.string()),
          createdKeys: z.array(z.string()),
          skippedExistingKeys: z.array(z.string()),
          duplicateKeys: z.array(
            z.object({
              key: z.string(),
              occurrences: z.number().int().min(2),
            }),
          ),
          warnings: z.array(z.string()),
        }),
      },
    },
    getByKey: {
      method: 'GET' as const,
      path: '/api/help-texts/:helpKey',
      responses: {
        200: z.object({
          helpKey: z.string(),
          title: z.string(),
          body: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/help-texts',
      responses: {
        200: z.array(z.custom<typeof helpTexts.$inferSelect>()),
      },
    },
    getById: {
      method: 'GET' as const,
      path: '/api/help-texts/by-id/:id',
      responses: {
        200: z.custom<typeof helpTexts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/help-texts',
      input: insertHelpTextSchema,
      responses: {
        201: z.custom<typeof helpTexts.$inferSelect>(),
        400: errorSchemas.validation,
        409: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/help-texts/:id',
      input: updateHelpTextSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof helpTexts.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    toggleActive: {
      method: 'PATCH' as const,
      path: '/api/help-texts/:id/active',
      input: z.object({
        isActive: z.boolean(),
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof helpTexts.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/help-texts/:id',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  // Projects API (FT 02 - Projektverwaltung)
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      input: z.object({
        filter: z.enum(["active", "inactive", "all"]).optional(),
        customerId: z.union([z.string(), z.number()]).optional(),
        tagIds: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional(),
        scope: z.enum(["upcoming", "noAppointments", "all", "withAppointments"]).default("upcoming"),
      }),
      responses: {
        200: z.array(projectListItemSchema),
      },
    },
    pagedList: {
      method: 'GET' as const,
      path: '/api/projects/list',
      input: z.object({
        filter: z.enum(["active", "inactive", "all"]).optional(),
        customerId: z.union([z.string(), z.number()]).optional(),
        tagIds: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional(),
        scope: z.enum(["upcoming", "noAppointments", "all", "withAppointments"]).default("upcoming"),
        title: z.string().trim().optional(),
        customerLastName: z.string().trim().optional(),
        customerNumber: z.string().trim().optional(),
        orderNumber: z.string().trim().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      }).strict(),
      responses: {
        200: projectBoardListResponseSchema,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.object({
          project: projectWithOrderAndArticleItemsSchema,
          projectOrder: projectOrderResponseSchema.nullable(),
          customer: z.custom<typeof customers.$inferSelect>(),
          tags: z.array(tagSchema),
          projectNotes: z.array(z.custom<typeof notes.$inferSelect>()),
          projectAttachments: z.array(z.custom<typeof projectAttachments.$inferSelect>()),
          projectAppointments: z.array(entityAppointmentItemSchema),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: projectWithOrderSchema,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        409: z.object({ code: z.literal("INACTIVE_ENTITY_ASSIGNMENT") }),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: updateProjectSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: projectWithOrderSchema,
        404: errorSchemas.notFound,
        409: z.object({
          code: z.enum(["VERSION_CONFLICT", "INACTIVE_ENTITY_ASSIGNMENT"]),
        }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    reklamation: {
      set: {
        method: "POST" as const,
        path: "/api/projects/:id/reklamation",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: appointmentMutationResponseSchema.extend({ kind: z.enum(["updated", "noop"]) }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      remove: {
        method: "DELETE" as const,
        path: "/api/projects/:id/reklamation",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: appointmentMutationResponseSchema.extend({ kind: z.enum(["updated", "noop"]) }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    order: {
      get: {
        method: "GET" as const,
        path: "/api/projects/:id/order",
        responses: {
          200: projectOrderResponseSchema,
          404: errorSchemas.notFound,
        },
      },
      upsert: {
        method: "PUT" as const,
        path: "/api/projects/:id/order",
        input: updateProjectOrderSchema.extend({
          version: z.number().int().min(1).optional(),
        }).strict(),
        responses: {
          200: projectOrderResponseSchema,
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    orderItems: {
      list: {
        method: "GET" as const,
        path: "/api/projects/:id/order-items",
        responses: {
          200: z.array(z.custom<typeof projectOrderItems.$inferSelect>()),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/projects/:id/order-items",
        input: insertProjectOrderItemSchema,
        responses: {
          201: z.custom<typeof projectOrderItems.$inferSelect>(),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["BUSINESS_CONFLICT", "INACTIVE_ENTITY_ASSIGNMENT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/projects/:id/order-items/:itemId",
        input: updateProjectOrderItemSchema.extend({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: z.custom<typeof projectOrderItems.$inferSelect>(),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT", "INACTIVE_ENTITY_ASSIGNMENT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/projects/:id/order-items/:itemId",
        input: z.object({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      replace: {
        method: "PUT" as const,
        path: "/api/projects/:id/order-items",
        input: z.object({
          items: z.array(insertProjectOrderItemSchema),
        }).strict(),
        responses: {
          200: z.array(z.custom<typeof projectOrderItems.$inferSelect>()),
          404: errorSchemas.notFound,
          409: z.object({ code: z.enum(["BUSINESS_CONFLICT", "INACTIVE_ENTITY_ASSIGNMENT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
  },
  projectTags: {
    list: {
      method: "GET" as const,
      path: "/api/projects/:projectId/tags",
      responses: {
        200: z.array(tagRelationItemSchema),
        404: errorSchemas.notFound,
      },
    },
    add: {
      method: "POST" as const,
      path: "/api/projects/:projectId/tags",
      input: z.object({
        tagId: z.number().int().positive(),
      }).strict(),
      responses: {
        201: tagRelationItemSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    remove: {
      method: "DELETE" as const,
      path: "/api/projects/:projectId/tags/:tagId",
      input: z.object({
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  projectNotes: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/notes',
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/notes',
      input: insertNoteSchema.extend({ templateId: z.number().optional() }),
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:projectId/notes/:noteId',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  calendarWeekNotes: {
    list: {
      method: 'GET' as const,
      path: '/api/calendar-weeks/:yearNumber/:weekNumber/tours/:tourId/notes',
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/calendar-weeks/:yearNumber/:weekNumber/tours/:tourId/notes',
      input: insertNoteSchema.extend({ templateId: z.number().optional() }),
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/calendar-weeks/:yearNumber/:weekNumber/tours/:tourId/notes/:noteId',
      input: z.object({
        version: z.number().int().min(1),
      }),
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  tourAppointments: {
    list: {
      method: 'GET' as const,
      path: '/api/tours/:tourId/current-appointments',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          version: z.number().int().min(1),
          projectId: z.number(),
          projectName: z.string(),
          projectVersion: z.number().int().min(1),
          projectOrderNumber: z.string().nullable(),
          projectArticleItems: z.array(projectArticleItemSchema),
          projectDescription: z.string().nullable(),
          startDate: z.string(),
          endDate: z.string().nullable(),
          startTime: z.string().nullable(),
          startTimeHour: z.number().int().min(0).max(23).nullable(),
          tourId: z.number().nullable(),
          tourName: z.string().nullable(),
          tourColor: z.string().nullable(),
          customer: z.object({
            id: z.number(),
            customerNumber: z.string(),
            fullName: z.string().nullable(),
            addressLine1: z.string().nullable(),
            addressLine2: z.string().nullable(),
            postalCode: z.string().nullable(),
            city: z.string().nullable(),
            country: z.string().nullable(),
          }),
          employees: z.array(
            z.object({
              id: z.number(),
              fullName: z.string(),
            }),
          ),
          customerNotesCount: z.number().int().min(0),
          projectNotesCount: z.number().int().min(0),
          appointmentNotesCount: z.number().int().min(0),
          isLocked: z.boolean(),
        })),
      },
    },
  },
  tourPrintPreview: {
    get: {
      method: "GET" as const,
      path: "/api/tours/:tourId/print-preview",
      input: z.object({
        fromDate: z.string(),
        weekCount: z.coerce.number().int().min(1).max(12),
      }).strict(),
      responses: {
        200: tourPrintPreviewResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  projectAppointments: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/appointments',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          projectId: z.number(),
          projectName: z.string(),
          projectVersion: z.number().int().min(1),
          projectOrderNumber: z.string().nullable(),
          projectArticleItems: z.array(projectArticleItemSchema),
          projectDescription: z.string().nullable(),
          startDate: z.string(),
          endDate: z.string().nullable(),
          startTime: z.string().nullable(),
          startTimeHour: z.number().int().min(0).max(23).nullable(),
          tourId: z.number().nullable(),
          tourName: z.string().nullable(),
          tourColor: z.string().nullable(),
          customer: z.object({
            id: z.number(),
            customerNumber: z.string(),
            fullName: z.string().nullable(),
            addressLine1: z.string().nullable(),
            addressLine2: z.string().nullable(),
            postalCode: z.string().nullable(),
            city: z.string().nullable(),
            country: z.string().nullable(),
          }),
          employees: z.array(
            z.object({
              id: z.number(),
              fullName: z.string(),
            }),
          ),
          customerNotesCount: z.number().int().min(0),
          projectNotesCount: z.number().int().min(0),
          appointmentNotesCount: z.number().int().min(0),
          isLocked: z.boolean(),
        })),
      },
    },
  },
  projectAttachments: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/attachments',
      responses: {
        200: z.array(z.custom<typeof projectAttachments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/attachments',
      responses: {
        201: z.custom<typeof projectAttachments.$inferSelect>(),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/project-attachments/:id',
      responses: {
        200: z.object({ message: z.string() }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/project-attachments/:id/download',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  appointmentAttachments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments/:appointmentId/attachments',
      responses: {
        200: z.array(z.custom<typeof appointmentAttachments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments/:appointmentId/attachments',
      responses: {
        201: z.custom<typeof appointmentAttachments.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        413: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/appointment-attachments/:id',
      responses: {
        200: z.object({ message: z.string() }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/appointment-attachments/:id/download',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  employeeAttachments: {
    list: {
      method: 'GET' as const,
      path: '/api/employees/:employeeId/attachments',
      responses: {
        200: z.array(z.custom<typeof employeeAttachments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees/:employeeId/attachments',
      responses: {
        201: z.custom<typeof employeeAttachments.$inferSelect>(),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/employee-attachments/:id',
      responses: {
        200: z.object({ message: z.string() }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/employee-attachments/:id/download',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  customerAttachments: {
    list: {
      method: 'GET' as const,
      path: '/api/customers/:customerId/attachments',
      responses: {
        200: z.array(z.custom<typeof customerAttachments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers/:customerId/attachments',
      responses: {
        201: z.custom<typeof customerAttachments.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customer-attachments/:id',
      responses: {
        200: z.object({ message: z.string() }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/customer-attachments/:id/download',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  customerAttachmentAggregates: {
    projectAttachmentsByCustomer: {
      method: "GET" as const,
      path: "/api/customers/:customerId/project-attachments",
      input: z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
      }).strict(),
      responses: {
        200: z.object({
          items: z.array(customerProjectAttachmentGroupSchema),
          totalProjects: z.number().int().min(0),
          totalAttachments: z.number().int().min(0),
          page: z.number().int().min(1),
          pageSize: z.number().int().min(1),
          hasMore: z.boolean(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  appointmentAttachmentContext: {
    get: {
      method: "GET" as const,
      path: "/api/appointments/:appointmentId/attachment-context",
      responses: {
        200: appointmentAttachmentContextSchema,
        404: errorSchemas.notFound,
      },
    },
  },
  attachmentDuplicates: {
    checkOriginalName: {
      method: "POST" as const,
      path: "/api/attachments/duplicates/check-original-name",
      input: z.object({
        originalName: z.string().trim().min(1),
      }).strict(),
      responses: {
        200: z.object({
          duplicate: z.boolean(),
          summary: z.object({
            customer: z.number().int().min(0),
            project: z.number().int().min(0),
            employee: z.number().int().min(0),
            appointment: z.number().int().min(0),
          }),
          hits: z.array(attachmentDuplicateHitSchema),
        }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  admin: {
    customerBulkImportAnalyze: {
      method: "POST" as const,
      path: "/api/admin/customers/bulk-import/analyze",
      responses: {
        200: z.object({
          bulkImportSessionId: z.string(),
          newCustomers: z.array(bulkImportCustomerAnalyzeItemSchema),
          duplicates: z.array(bulkImportCustomerDuplicateItemSchema),
          errors: z.array(z.object({ fileName: z.string(), reason: z.string() })),
          log: z.array(z.object({ fileName: z.string(), status: z.string() })),
          limits: z.object({
            maxFiles: z.number().int().positive(),
            maxFileSizeBytes: z.number().int().positive(),
            maxTotalBytes: z.number().int().positive(),
          }),
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        413: z.object({ code: z.literal("BULK_IMPORT_LIMIT_EXCEEDED"), message: z.string() }),
      },
    },
    customerBulkImportApplyNew: {
      method: "POST" as const,
      path: "/api/admin/customers/bulk-import/apply-new",
      input: z.object({
        bulkImportSessionId: z.string().min(1),
        selectedIds: z.array(z.string().min(1)).min(1),
      }).strict(),
      responses: {
        200: z.object({
          created: z.number().int().min(0),
          createdCustomerIds: z.array(z.number().int().positive()),
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({
          code: z.literal("VALIDATION_ERROR"),
          details: z.array(z.object({
            id: z.string(),
            field: z.string(),
            message: z.string(),
          })),
        }),
      },
    },
    customerBulkImportApplyDuplicates: {
      method: "POST" as const,
      path: "/api/admin/customers/bulk-import/apply-duplicates",
      input: z.object({
        bulkImportSessionId: z.string().min(1),
        selectedIds: z.array(z.string().min(1)).min(1),
      }).strict(),
      responses: {
        200: z.object({
          updated: z.number().int().min(0),
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    projectBulkImportAnalyze: {
      method: "POST" as const,
      path: "/api/admin/projects/bulk-import/analyze",
      responses: {
        200: z.object({
          bulkImportSessionId: z.string(),
          newProjects: z.array(bulkImportProjectAnalyzeItemSchema),
          duplicates: z.array(bulkImportProjectDuplicateItemSchema),
          specialCases: z.array(bulkImportProjectSpecialItemSchema),
          errors: z.array(z.object({ fileName: z.string(), reason: z.string() })),
          log: z.array(z.object({ fileName: z.string(), status: z.string() })),
          limits: z.object({
            maxFiles: z.number().int().positive(),
            maxFileSizeBytes: z.number().int().positive(),
            maxTotalBytes: z.number().int().positive(),
          }),
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        413: z.object({ code: z.literal("BULK_IMPORT_LIMIT_EXCEEDED"), message: z.string() }),
      },
    },
    projectBulkImportApplyNew: {
      method: "POST" as const,
      path: "/api/admin/projects/bulk-import/apply-new",
      input: z.object({
        bulkImportSessionId: z.string().min(1),
        selectedIds: z.array(z.string().min(1)).min(1),
      }).strict(),
      responses: {
        200: z.object({
          created: z.number().int().min(0),
          createdProjectIds: z.array(z.number().int().positive()),
          attachmentLinked: z.number().int().min(0),
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({
          code: z.literal("VALIDATION_ERROR"),
          details: z.array(z.object({
            id: z.string(),
            field: z.string(),
            message: z.string(),
          })),
        }),
      },
    },
    projectBulkImportApplySpecialCase: {
      method: "POST" as const,
      path: "/api/admin/projects/bulk-import/apply-special-case",
      input: z.object({
        bulkImportSessionId: z.string().min(1),
        id: z.string().min(1),
      }).strict(),
      responses: {
        200: z.object({
          customerId: z.number().int().positive(),
          projectId: z.number().int().positive(),
          attachmentLinked: z.boolean(),
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({
          code: z.literal("VALIDATION_ERROR"),
          details: z.array(z.object({
            field: z.string(),
            message: z.string(),
          })),
        }),
      },
    },
    masterDataPdfMiningLimits: {
      method: "GET" as const,
      path: "/api/admin/master-data/pdf-mining/limits",
      responses: {
        200: bulkImportLimitsSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    masterDataPdfMiningAnalyze: {
      method: "POST" as const,
      path: "/api/admin/master-data/pdf-mining/analyze",
      responses: {
        200: z.object({
          documents: z.array(masterDataMiningDocumentSchema),
          productGroups: z.array(masterDataMiningProductGroupSchema),
          skipped: z.array(masterDataMiningSkippedDocumentSchema),
          errors: z.array(z.object({ fileName: z.string(), reason: z.string() })),
          limits: bulkImportLimitsSchema,
        }),
        400: errorSchemas.validation,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        413: z.object({ code: z.literal("BULK_IMPORT_LIMIT_EXCEEDED"), message: z.string() }),
      },
    },
    systemSeedPreview: {
      method: "GET" as const,
      path: "/api/admin/system-seed",
      responses: {
        200: z.object({
          items: z.array(z.object({
            key: z.string().min(1),
            kind: z.enum(["tag", "tour", "customer", "noteTemplate", "calendarMarker"]),
            label: z.string().min(1),
            status: z.enum(["missing", "unchanged", "update", "migrate"]),
            message: z.string().min(1),
            canApply: z.boolean(),
            checkedByDefault: z.boolean(),
          })),
        }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    systemSeedApply: {
      method: "POST" as const,
      path: "/api/admin/system-seed",
      input: z.object({
        selectedKeys: z.array(z.string().min(1)),
      }).strict(),
      responses: {
        200: z.object({
          logLines: z.array(z.string()),
        }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
  },
  backups: {
    runNow: {
      method: "POST" as const,
      path: "/api/admin/backups/run",
      responses: {
        200: z.object({
          status: z.enum(["success", "error", "skipped"]),
          logId: z.number().int().positive().nullable(),
          exportedRecordCount: z.number().int().min(0),
          filePath: z.string().nullable(),
          cleanupDeletedCount: z.number().int().min(0),
          reason: z.string().nullable(),
        }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    listLogs: {
      method: "GET" as const,
      path: "/api/admin/backups/logs",
      responses: {
        200: z.array(
          z.object({
            id: z.number().int().positive(),
            createdAt: z.string(),
            status: z.enum(["success", "error", "skipped"]),
            errorMessage: z.string().nullable(),
            exportedRecordCount: z.number().int().min(0),
            filePath: z.string().nullable(),
          }),
        ),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    download: {
      method: "GET" as const,
      path: "/api/admin/backups/:id/download/:kind",
      responses: {
        200: z.any(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
      },
    },
  },
  dumps: {
    create: {
      method: "POST" as const,
      path: "/api/admin/dumps/create",
      responses: {
        200: z.object({
          filename: z.string(),
          sizeBytes: z.number().int().min(0),
          createdAt: z.string(),
        }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        500: z.object({ code: z.literal("INTERNAL_ERROR") }),
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/admin/dumps",
      responses: {
        200: z.array(
          z.object({
            filename: z.string(),
            sizeBytes: z.number().int().min(0),
            createdAt: z.string(),
          }),
        ),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    download: {
      method: "GET" as const,
      path: "/api/admin/dumps/:filename/download",
      responses: {
        200: z.any(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    importPreview: {
      method: "POST" as const,
      path: "/api/admin/dumps/import/preview",
      responses: {
        200: z.object({
          fileHash: z.string().min(1),
          dumpId: z.string().min(1),
          targetDatabaseName: z.string().min(1),
          transferReadiness: z.enum(["ready", "warning", "blocked"]),
          blockingIssues: z.array(z.string()),
          warnings: z.array(z.string()),
          confirmationPhrase: z.string().min(1),
          allowsProductionImport: z.boolean(),
          isLegacyDump: z.boolean(),
          manifestPresent: z.boolean(),
          schemaRevision: z.string().nullable(),
          expectedTables: z.array(z.object({
            key: z.string(),
            rowCount: z.number().int().min(0),
            sha256: z.string().min(1),
          })),
          expectedUploads: z.object({
            fileCount: z.number().int().min(0),
            totalBytes: z.number().int().min(0),
            sha256: z.string().min(1),
          }),
        }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        500: z.object({ code: z.literal("INTERNAL_ERROR") }),
      },
    },
    importApply: {
      method: "POST" as const,
      path: "/api/admin/dumps/import/apply",
      responses: {
        200: z.object({
          transferId: z.string().min(1),
          dumpId: z.string().min(1),
          targetDatabaseName: z.string().min(1),
          targetBackupCreated: z.boolean(),
          verificationPassed: z.boolean(),
          importStatus: z.enum(["success", "warning", "error"]),
          tablesRestored: z.number().int().min(0),
          uploadsRestored: z.boolean(),
          durationMs: z.number().int().min(0),
          warnings: z.array(z.string()),
          blockingIssues: z.array(z.string()),
          journalPath: z.string().min(1),
          targetBackupPath: z.string().nullable(),
          expectedUploads: z.object({
            fileCount: z.number().int().min(0),
            totalBytes: z.number().int().min(0),
            sha256: z.string().min(1),
          }),
          verifiedTables: z.array(z.object({
            key: z.string(),
            expectedRowCount: z.number().int().min(0),
            actualRowCount: z.number().int().min(0),
            matches: z.boolean(),
          })),
          verifiedUploads: z.object({
            fileCountMatches: z.boolean(),
            totalBytesMatches: z.boolean(),
            sha256Matches: z.boolean(),
          }),
        }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        409: z.object({ code: z.enum(["FILE_HASH_MISMATCH", "CONFIRMATION_MISMATCH"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        500: z.object({ code: z.literal("INTERNAL_ERROR") }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/admin/dumps/:filename",
      responses: {
        200: z.object({ ok: z.literal(true) }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  reports: {
    defaults: {
      get: {
        method: "GET" as const,
        path: "/api/reports/defaults",
        responses: {
          200: reportConfigDefaultsResponseSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
    },
    vorlaufliste: {
      list: {
        method: "GET" as const,
        path: "/api/reports/vorlaufliste",
        input: z.object({
          fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          refreshKey: z.string().optional(),
          useShortCodes: z.preprocess(
            (value) => value === "true" || value === true,
            z.boolean().default(false),
          ),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(100),
        }).strict(),
        responses: {
          200: reportVorlauflisteResponseSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      printPreview: {
        method: "GET" as const,
        path: "/api/reports/vorlaufliste/print-preview",
        input: z.object({
          fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          useShortCodes: z.preprocess(
            (value) => value === "true" || value === true,
            z.boolean().default(false),
          ),
        }).strict(),
        responses: {
          200: reportVorlauflistePrintPreviewResponseSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    produktionsplanung: {
      list: {
        method: "GET" as const,
        path: "/api/reports/produktionsplanung",
        input: z.object({
          fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          productCategoryIds: z.preprocess(
            (value) => value == null ? [] : Array.isArray(value) ? value : [value],
            z.array(z.coerce.number().int().positive()).default([]),
          ),
          componentCategoryIds: z.preprocess(
            (value) => value == null ? [] : Array.isArray(value) ? value : [value],
            z.array(z.coerce.number().int().positive()).default([]),
          ),
          useShortCodes: z.preprocess(
            (value) => value === "true" || value === true,
            z.boolean().default(false),
          ),
        }).strict(),
        responses: {
          200: reportProduktionsplanungResponseSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    auftragsliste: {
      list: {
        method: "GET" as const,
        path: "/api/reports/auftragsliste",
        input: z.object({
          fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          productCategoryIds: z.preprocess(
            (value) => value == null ? [] : Array.isArray(value) ? value : [value],
            z.array(z.coerce.number().int().positive()).default([]),
          ),
          componentCategoryIds: z.preprocess(
            (value) => value == null ? [] : Array.isArray(value) ? value : [value],
            z.array(z.coerce.number().int().positive()).default([]),
          ),
          tagIds: z.preprocess(
            (value) => value == null ? [] : Array.isArray(value) ? value : [value],
            z.array(z.coerce.number().int().positive()).default([]),
          ),
          saunaModels: z.preprocess(
            (value) => value == null ? [] : Array.isArray(value) ? value : [value],
            z.array(z.string().trim().min(1)).default([]),
          ),
          useShortCodes: z.preprocess(
            (value) => value === "true" || value === true,
            z.boolean().default(false),
          ),
        }).strict(),
        responses: {
          200: reportAuftragslisteResponseSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
  },
  monitoring: {
    list: {
      method: "GET" as const,
      path: "/api/monitoring",
      responses: {
        200: z.array(monitoringItemSchema),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    adminConfigGet: {
      method: "GET" as const,
      path: "/api/admin/monitoring/config",
      responses: {
        200: monitoringConfigResponseSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    adminConfigSet: {
      method: "PUT" as const,
      path: "/api/admin/monitoring/config",
      input: monitoringConfigResponseSchema,
      responses: {
        200: monitoringConfigResponseSchema,
        403: z.object({ code: z.literal("FORBIDDEN") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  userSettings: {
    getResolved: {
      method: 'GET' as const,
      path: '/api/user-settings/resolved',
      responses: {
        200: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            description: z.string(),
            type: z.enum(["enum", "string", "number", "boolean", "json"]),
            constraints: z.record(z.unknown()),
            allowedScopes: z.array(z.enum(["GLOBAL", "ROLE", "USER"])),
            defaultValue: z.unknown(),
            globalValue: z.unknown().optional(),
            globalVersion: z.number().int().min(1).optional(),
            roleValue: z.unknown().optional(),
            roleVersion: z.number().int().min(1).optional(),
            userValue: z.unknown().optional(),
            userVersion: z.number().int().min(1).optional(),
            resolvedValue: z.unknown(),
            resolvedVersion: z.number().int().min(1).optional(),
            resolvedScope: z.enum(["USER", "ROLE", "GLOBAL", "DEFAULT"]),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
            roleKey: z.enum(["LESER", "DISPONENT", "ADMIN"]),
            updatedAt: z.string().nullable().optional(),
            updatedBy: z.number().nullable().optional(),
          }),
        ),
        400: errorSchemas.validation,
      },
    },
    set: {
      method: "PATCH" as const,
      path: "/api/user-settings",
      input: z.object({
        key: z.string().min(1),
        scopeType: z.enum(["GLOBAL", "ROLE", "USER"]),
        version: z.number().int().min(1),
        value: z.unknown(),
      }),
      responses: {
        200: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            description: z.string(),
            type: z.enum(["enum", "string", "number", "boolean"]),
            constraints: z.record(z.unknown()),
            allowedScopes: z.array(z.enum(["GLOBAL", "ROLE", "USER"])),
            defaultValue: z.unknown(),
            globalValue: z.unknown().optional(),
            globalVersion: z.number().int().min(1).optional(),
            roleValue: z.unknown().optional(),
            roleVersion: z.number().int().min(1).optional(),
            userValue: z.unknown().optional(),
            userVersion: z.number().int().min(1).optional(),
            resolvedValue: z.unknown(),
            resolvedVersion: z.number().int().min(1).optional(),
            resolvedScope: z.enum(["USER", "ROLE", "GLOBAL", "DEFAULT"]),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
            roleKey: z.enum(["LESER", "DISPONENT", "ADMIN"]),
            updatedAt: z.string().nullable().optional(),
            updatedBy: z.number().nullable().optional(),
          }),
        ),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  changeNotifications: {
    stream: {
      method: "GET" as const,
      path: "/api/change-notifications/stream",
      responses: {
        200: z.any(),
        401: z.object({ code: z.literal("UNAUTHORIZED") }),
      },
    },
  },
  dataVersion: {
    get: {
      path: "/api/data-version",
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type TourInput = z.infer<typeof api.tours.create.input>;
export type TourUpdateInput = z.infer<typeof api.tours.update.input>;
export type TourResponse = z.infer<typeof api.tours.create.responses[201]>;

export type TeamInput = z.infer<typeof api.teams.create.input>;
export type TeamUpdateInput = z.infer<typeof api.teams.update.input>;
export type TeamResponse = z.infer<typeof api.teams.create.responses[201]>;

export type CustomerInput = z.infer<typeof api.customers.create.input>;
export type CustomerUpdateInput = z.infer<typeof api.customers.update.input>;
export type CustomerResponse = z.infer<typeof api.customers.create.responses[201]>;

export type NoteInput = z.infer<typeof api.customerNotes.create.input>;
export type NoteUpdateInput = z.infer<typeof api.notes.update.input>;
export type NoteResponse = z.infer<typeof api.notes.update.responses[200]>;

export type NoteTemplateInput = z.infer<typeof api.noteTemplates.create.input>;
export type NoteTemplateUpdateInput = z.infer<typeof api.noteTemplates.update.input>;
export type NoteTemplateResponse = z.infer<typeof api.noteTemplates.create.responses[201]>;

export type HelpTextInput = z.infer<typeof api.helpTexts.create.input>;
export type HelpTextUpdateInput = z.infer<typeof api.helpTexts.update.input>;
export type HelpTextResponse = z.infer<typeof api.helpTexts.create.responses[201]>;

export type EmployeeInput = z.infer<typeof api.employees.create.input>;
export type EmployeeUpdateInput = z.infer<typeof api.employees.update.input>;
export type EmployeeResponse = z.infer<typeof api.employees.create.responses[201]>;
export type EmployeeWithRelations = z.infer<typeof api.employees.get.responses[200]>;
export type EmployeeRevenueOverviewResponse = z.infer<typeof api.employees.revenueOverview.responses[200]>;
export type EmployeeAppointmentAbsenceInput = z.infer<typeof api.employees.absenceAppointments.create.input>;
export type EmployeeAppointmentAbsenceResponse = z.infer<typeof api.employees.absenceAppointments.create.responses[201]>;
export type AuthLoginResponse = z.infer<typeof api.auth.login.responses[200]>;
export type AuthenticatedResponse = z.infer<typeof api.auth.twoFactorVerify.responses[200]>;
export type ChangeNotificationEvent = z.infer<typeof _changeNotificationEventSchema>;
export type UserSettingsResolvedResponse = z.infer<typeof api.userSettings.getResolved.responses[200]>;
export type MonitoringListResponse = z.infer<typeof api.monitoring.list.responses[200]>;
export type MonitoringConfigResponse = z.infer<typeof api.monitoring.adminConfigGet.responses[200]>;
export type GermanStateCode = z.infer<typeof germanStateCodeSchema>;
export type CalendarMarkerType = z.infer<typeof calendarMarkerTypeSchema>;
export type CalendarMarkerSource = z.infer<typeof calendarMarkerSourceSchema>;
export type CalendarMarkerScope = z.infer<typeof calendarMarkerScopeSchema>;
export type CalendarMarker = z.infer<typeof calendarMarkerSchema>;
export type CalendarMarkerWriteInput = z.infer<typeof calendarMarkerWriteSchema>;
export type CalendarMarkerUpdateInput = z.infer<typeof calendarMarkerUpdateSchema>;
export type MonitoringTriggerSummaryItemResponse = {
  triggerCode: (typeof MONITORING_TRIGGER_CODES)[number];
  triggerName: string;
  count: number;
  color: string;
};
export const monitoringTriggerMetadata = {
  codes: MONITORING_TRIGGER_CODES,
  names: MONITORING_TRIGGER_NAMES,
  colors: MONITORING_TRIGGER_COLORS,
} as const;
export type ReportAuftragslisteProjectRow = z.infer<typeof reportAuftragslisteProjectRowSchema>;
export type ReportAuftragslisteResponse = z.infer<typeof reportAuftragslisteResponseSchema>;
export type ReportProduktionsplanungCategoryGroup = z.infer<typeof reportProduktionsplanungCategoryGroupSchema>;
export type ReportProduktionsplanungProjectRow = z.infer<typeof reportProduktionsplanungProjectRowSchema>;
export type ReportProduktionsplanungResponse = z.infer<typeof reportProduktionsplanungResponseSchema>;

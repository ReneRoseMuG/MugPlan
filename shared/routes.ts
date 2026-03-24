import { z } from 'zod';
import { appointmentDisplayModes } from "./appointmentDisplayMode";
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
  insertProjectStatusSchema, updateProjectStatusSchema, projectStatus,
  insertEmployeeSchema, updateEmployeeSchema, employees,
  insertEmployeeAbsenceSchema, updateEmployeeAbsenceSchema, employeeAbsences,
  insertHelpTextSchema, updateHelpTextSchema, helpTexts,
  tags,
  insertProductCategorySchema, updateProductCategorySchema, productCategories,
  insertComponentCategorySchema, updateComponentCategorySchema, componentCategories,
  insertProductSchema, updateProductSchema, products,
  insertComponentSchema, updateComponentSchema, components,
  insertComponentSpecificationSchema, updateComponentSpecificationSchema, componentSpecifications,
  productComponent,
} from './schema';
import type { Project, ProjectOrder } from "./schema";
import type { ProjectArticleItem } from "./projectArticleList";

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

const activeScopeSchema = z.enum(["active", "inactive", "all"]).default("active");

const projectArticleItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const appointmentTagGroupsSchema = z.object({
  appointmentTags: z.array(tagSchema),
  customerTags: z.array(tagSchema),
  projectTags: z.array(tagSchema),
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
  employeeVersion: z.number().int().min(1),
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
  code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]),
  conflictEmployees: z.array(tourEmployeeCascadeAppointmentEmployeeSchema).optional(),
}).passthrough();

const employeeAbsenceBulkReplaceSkippedReasonSchema = z.enum([
  "EMPLOYEE_ABSENCE",
  "EMPLOYEE_EXIT_DATE",
]);

const employeeAbsenceAffectedAppointmentSchema = z.object({
  appointmentId: z.number().int().positive(),
  startDate: z.string(),
  tourName: z.string().nullable(),
  employees: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string(),
    }),
  ),
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
  version: z.number().int().min(1),
  notesCount: z.number().int().min(0),
  plannedAppointmentsCount: z.number().int().min(0),
  nextAppointmentStartDate: z.string().nullable(),
  nextAppointmentStartTimeHour: z.number().int().min(0).max(23).nullable(),
  tags: z.array(tagSchema),
  historicalAppointments: z.array(z.object({
    id: z.number(),
    startDate: z.string(),
    startTime: z.string().nullable(),
    orderNumber: z.string().nullable(),
    projectName: z.string(),
  })),
});

const projectBoardStatusSchema = z.object({
  id: z.number(),
  title: z.string(),
  color: z.string(),
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
  plannedAppointmentsCount: z.number().int().min(0),
  nextAppointmentStartDate: z.string().nullable(),
  nextAppointmentStartTimeHour: z.number().int().min(0).max(23).nullable(),
  projectArticleItems: z.array(projectArticleItemSchema),
  tags: z.array(tagSchema),
  customer: z.object({
    id: z.number(),
    customerNumber: z.string(),
    fullName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  statuses: z.array(projectBoardStatusSchema),
});

const customerBoardListResponseSchema = pagedListMetaSchema.extend({
  items: z.array(customerBoardListItemSchema),
});

const projectBoardListResponseSchema = pagedListMetaSchema.extend({
  items: z.array(projectBoardListItemSchema),
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
  tags: z.array(tagSchema),
  highlightTag: tagSchema.nullable(),
  amount: z.string().nullable(),
  customerFullName: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  articleValues: z.array(reportVorlauflisteArticleValueSchema),
  plannedDateText: z.string().nullable(),
  plannedWeek: z.string().nullable(),
  actualDate: z.string(),
  projectDescription: z.string().nullable(),
  reportState: appointmentCancellationReportStateSchema,
});

const reportVorlauflisteResponseSchema = pagedListMetaSchema.extend({
  productCategories: z.array(reportVorlauflisteCategorySchema),
  componentCategories: z.array(reportVorlauflisteCategorySchema),
  items: z.array(reportVorlauflisteItemSchema),
});

const reportProductVorlaufItemTotalSchema = z.object({
  itemName: z.string().min(1),
  totalQuantity: z.number().int().min(0),
});

const reportProductVorlaufCategoryGroupSchema = z.object({
  categoryId: z.number().int().positive(),
  categoryName: z.string().min(1),
  items: z.array(reportProductVorlaufItemTotalSchema),
});

const reportProductVorlaufSpecialMeasureProjectSchema = z.object({
  projectId: z.number().int().positive(),
  orderNumber: z.string().nullable(),
  customerNumber: z.string().nullable(),
  customerFullName: z.string().nullable(),
  actualDate: z.string().nullable(),
  projectDescription: z.string().nullable(),
  specialMeasureTag: tagSchema.nullable(),
});

const reportProductVorlaufResponseSchema = z.object({
  productCategoryGroups: z.array(reportProductVorlaufCategoryGroupSchema),
  componentCategoryGroups: z.array(reportProductVorlaufCategoryGroupSchema),
  specialMeasureProjects: z.array(reportProductVorlaufSpecialMeasureProjectSchema),
});

const authenticatedResponseSchema = z.object({
  status: z.literal("authenticated"),
  userId: z.number().int().positive(),
  username: z.string(),
  roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
});

const monitoringItemSchema = z.object({
  appointmentId: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  tourName: z.string().nullable(),
  employeeCount: z.number().int().min(0),
  triggerName: z.string().min(1),
  problemDescription: z.string().min(1),
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
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
  }),
  employees: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string(),
    }),
  ),
  printNotes: z.array(tourPrintPreviewNoteSchema),
});

const tourPrintPreviewResponseSchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  weeks: z.array(
    z.object({
      weekStart: z.string(),
      weekEnd: z.string(),
    }),
  ),
  tour: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    color: z.string(),
  }),
  members: z.array(
    z.object({
      id: z.number().int().positive(),
      fullName: z.string(),
    }),
  ),
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

const masterDataSeedFileStatusSchema = z.object({
  sourceFile: z.string().min(1),
  exists: z.boolean(),
});

const masterDataSeedExecutionSchema = masterDataSeedFileStatusSchema.extend({
  logLines: z.array(z.string()),
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
        }),
        400: errorSchemas.validation,
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
                addressLine1: z.string().nullable(),
                addressLine2: z.string().nullable(),
                postalCode: z.string().nullable(),
                city: z.string().nullable(),
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
        }),
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
        }),
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
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.enum(["PAST_APPOINTMENT_READONLY", "CANCELLATION_TAG_NOT_CONFIGURED"]) }),
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
        409: z.object({ code: z.enum(["PAST_APPOINTMENT_READONLY", "CANCELLATION_TAG_PROTECTED", "CANCELLED_APPOINTMENT_READONLY"]) }),
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
        409: z.object({ code: z.enum(["VERSION_CONFLICT", "PAST_APPOINTMENT_READONLY", "CANCELLATION_TAG_PROTECTED", "CANCELLED_APPOINTMENT_READONLY"]) }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
  },
  appointmentEmployees: {
    remove: {
      method: "DELETE" as const,
      path: "/api/appointments/:id/employees/:employeeId",
      responses: {
        204: z.void(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
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
              addressLine1: z.string().nullable().optional(),
              addressLine2: z.string().nullable().optional(),
              postalCode: z.string().nullable(),
              city: z.string().nullable(),
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
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
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
  projectStatus: {
    list: {
      method: 'GET' as const,
      path: '/api/project-status',
      responses: {
        200: z.array(z.custom<typeof projectStatus.$inferSelect>()),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/project-status',
      input: insertProjectStatusSchema,
      responses: {
        201: z.custom<typeof projectStatus.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/project-status/:id',
      input: updateProjectStatusSchema.extend({
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof projectStatus.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    toggleActive: {
      method: 'PATCH' as const,
      path: '/api/project-status/:id/active',
      input: z.object({
        isActive: z.boolean(),
        version: z.number().int().min(1),
      }),
      responses: {
        200: z.custom<typeof projectStatus.$inferSelect>(),
        403: z.object({ code: z.literal("FORBIDDEN") }),
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
        422: z.object({ code: z.literal("VALIDATION_ERROR") }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/project-status/:id',
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
        200: z.array(z.custom<typeof employees.$inferSelect & { tags: typeof tags.$inferSelect[] }>()),
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
    absences: {
      list: {
        method: "GET" as const,
        path: "/api/employees/:employeeId/absences",
        responses: {
          200: z.array(z.custom<typeof employeeAbsences.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
        },
      },
      get: {
        method: "GET" as const,
        path: "/api/employees/:employeeId/absences/:absenceId",
        responses: {
          200: z.custom<typeof employeeAbsences.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/employees/:employeeId/absences",
        input: insertEmployeeAbsenceSchema,
        responses: {
          201: z.custom<typeof employeeAbsences.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/employees/:employeeId/absences/:absenceId",
        input: updateEmployeeAbsenceSchema.extend({
          version: z.number().int().min(1),
        }),
        responses: {
          200: z.custom<typeof employeeAbsences.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/employees/:employeeId/absences/:absenceId",
        input: z.object({
          version: z.number().int().min(1),
        }),
        responses: {
          204: z.null(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          409: z.object({ code: z.literal("VERSION_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      previewAppointments: {
        method: "GET" as const,
        path: "/api/employees/:employeeId/absences/:absenceId/appointments-preview",
        responses: {
          200: z.object({
            absenceId: z.number().int().positive(),
            appointments: z.array(employeeAbsenceAffectedAppointmentSchema),
          }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
        },
      },
      bulkReplaceAppointments: {
        method: "POST" as const,
        path: "/api/employees/:employeeId/absences/:absenceId/bulk-replace-appointments",
        input: z.object({
          replacementEmployeeId: z.number().int().positive(),
        }).strict(),
        responses: {
          200: z.object({
            absenceId: z.number().int().positive(),
            updatedAppointmentCount: z.number().int().min(0),
            skippedAlreadyAssignedCount: z.number().int().min(0),
            skipped: z.array(z.object({
              appointmentId: z.number().int().positive(),
              reason: employeeAbsenceBulkReplaceSkippedReasonSchema,
            })),
          }),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: errorSchemas.notFound,
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
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
            fullName: z.string(),
            isActive: z.boolean(),
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
            fullName: z.string(),
            isActive: z.boolean(),
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
        roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]),
        version: z.number().int().min(1),
      }).strict(),
      responses: {
        200: z.array(
          z.object({
            id: z.number().int().positive(),
            version: z.number().int().min(1),
            username: z.string(),
            email: z.string(),
            fullName: z.string(),
            isActive: z.boolean(),
            roleCode: z.enum(["READER", "DISPATCHER", "ADMIN"]).nullable(),
            roleName: z.string().nullable(),
          }),
        ),
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
        409: z.object({ code: z.literal("VERSION_CONFLICT") }),
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
              assignedProductCount: z.number().int().nonnegative().optional(),
              projectOrderItemCount: z.number().int().nonnegative().optional(),
            }),
          ]),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    componentSpecifications: {
      listByComponent: {
        method: "GET" as const,
        path: "/api/admin/master-data/components/:id/specifications",
        responses: {
          200: z.array(z.custom<typeof componentSpecifications.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/master-data/components/:id/specifications",
        input: insertComponentSpecificationSchema,
        responses: {
          201: z.custom<typeof componentSpecifications.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/master-data/components/:id/specifications/:specificationId",
        input: updateComponentSpecificationSchema.extend({
          version: z.number().int().min(1),
        }).strict(),
        responses: {
          200: z.custom<typeof componentSpecifications.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/master-data/components/:id/specifications/:specificationId",
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
    componentProducts: {
      list: {
        method: "GET" as const,
        path: "/api/admin/master-data/component-products",
        responses: {
          200: z.array(z.custom<typeof productComponent.$inferSelect>()),
          403: z.object({ code: z.literal("FORBIDDEN") }),
        },
      },
      replaceByComponent: {
        method: "PUT" as const,
        path: "/api/admin/master-data/components/:id/products",
        input: z.object({
          version: z.number().int().min(1),
          productIds: z.array(z.number().int().positive()),
        }).strict(),
        responses: {
          200: z.custom<typeof components.$inferSelect>(),
          403: z.object({ code: z.literal("FORBIDDEN") }),
          404: z.object({ code: z.literal("NOT_FOUND") }),
          409: z.object({ code: z.enum(["VERSION_CONFLICT", "BUSINESS_CONFLICT"]) }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    seed: {
      employees: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/employees",
          responses: {
            200: masterDataSeedFileStatusSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/employees/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/employees/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
      helpTexts: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/help-texts",
          responses: {
            200: masterDataSeedFileStatusSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/help-texts/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/help-texts/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
      productManagement: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/product-management",
          responses: {
            200: z.object({
              sourceFile: z.string().min(1),
              exists: z.boolean(),
              extraFiles: z.array(masterDataSeedFileStatusSchema),
            }),
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/product-management/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            409: z.object({ code: z.literal("BUSINESS_CONFLICT") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/product-management/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
      noteTemplates: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/note-templates",
          responses: {
            200: masterDataSeedFileStatusSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/note-templates/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/note-templates/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
      tags: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/tags",
          responses: {
            200: masterDataSeedFileStatusSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/tags/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/tags/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
      tours: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/tours",
          responses: {
            200: masterDataSeedFileStatusSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/tours/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/tours/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
      users: {
        status: {
          method: "GET" as const,
          path: "/api/admin/master-data/seed/users",
          responses: {
            200: masterDataSeedFileStatusSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
          },
        },
        apply: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/users/apply",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
        export: {
          method: "POST" as const,
          path: "/api/admin/master-data/seed/users/export",
          input: z.object({}).strict(),
          responses: {
            200: masterDataSeedExecutionSchema,
            403: z.object({ code: z.literal("FORBIDDEN") }),
            422: z.object({ code: z.literal("VALIDATION_ERROR") }),
          },
        },
      },
    },
  },
  // Tour employees (for Tour/Team management)
  tourEmployees: {
    list: {
      method: 'GET' as const,
      path: '/api/tours/:tourId/employees',
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/tours/:tourId/employees/:employeeId',
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
      path: '/api/tours/:tourId/employees',
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
        scope: z.enum(["upcoming", "noAppointments", "all"]).default("upcoming"),
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
        scope: z.enum(["upcoming", "noAppointments", "all"]).default("upcoming"),
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
          project: projectWithOrderSchema,
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
  demoSeed: {
    createRun: {
      method: "POST" as const,
      path: "/api/admin/demo-seed-runs",
      input: z.union([
        z.object({
          runType: z.literal("base"),
          employees: z.number().int().min(0).default(0).optional(),
          customers: z.number().int().min(0).default(10),
          projects: z.number().int().min(0).max(1000).default(30),
          generateAttachments: z.boolean().default(true),
          randomSeed: z.number().int().optional(),
          locale: z.string().default("de").optional(),
        }).strict(),
        z.object({
          runType: z.literal("appointments"),
          baseSeedRunId: z.string().min(1),
          appointmentsPerProject: z.number().int().min(1).max(20).default(1),
          randomSeed: z.number().int().optional(),
          seedWindowDaysMin: z.number().int().min(-365).max(365).default(60).optional(),
          seedWindowDaysMax: z.number().int().min(1).max(365).default(90).optional(),
          reklDelayDaysMin: z.number().int().min(1).max(180).default(14).optional(),
          reklDelayDaysMax: z.number().int().min(1).max(365).default(42).optional(),
          reklShare: z.number().min(0).max(1).default(0.33).optional(),
          locale: z.string().default("de").optional(),
        }).strict(),
        z.object({
          employees: z.number().int().min(0).default(0).optional(),
          customers: z.number().int().min(0).default(10),
          projects: z.number().int().min(0).max(1000).default(30),
          appointmentsPerProject: z.number().int().min(0).max(20).default(1),
          generateAttachments: z.boolean().default(true),
          randomSeed: z.number().int().optional(),
          seedWindowDaysMin: z.number().int().min(-365).max(365).default(60).optional(),
          seedWindowDaysMax: z.number().int().min(1).max(365).default(90).optional(),
          reklDelayDaysMin: z.number().int().min(1).max(180).default(14).optional(),
          reklDelayDaysMax: z.number().int().min(1).max(365).default(42).optional(),
          reklShare: z.number().min(0).max(1).default(0.33).optional(),
          locale: z.string().default("de").optional(),
        }).strict(),
      ]),
      responses: {
        201: z.object({
          seedRunId: z.string(),
          createdAt: z.string(),
          runType: z.enum(["base", "appointments", "legacy"]),
          baseSeedRunId: z.string().optional(),
          requested: z.object({
            employees: z.number(),
            customers: z.number(),
            projects: z.number(),
            appointmentsPerProject: z.number(),
            generateAttachments: z.boolean(),
            seedWindowDaysMin: z.number(),
            seedWindowDaysMax: z.number(),
            reklDelayDaysMin: z.number(),
            reklDelayDaysMax: z.number(),
            reklShare: z.number(),
            locale: z.string(),
          }),
          dependentRunIds: z.array(z.string()).optional(),
          created: z.object({
            employees: z.number(),
            customers: z.number(),
            projects: z.number(),
            appointments: z.number(),
            mountAppointments: z.number(),
            reklAppointments: z.number(),
            notes: z.number(),
            noteTemplates: z.number(),
            teams: z.number(),
            tours: z.number(),
            attachments: z.number(),
          }),
          reductions: z.object({
            appointments: z.number(),
            reklMissingOven: z.number(),
            reklSkippedConstraints: z.number(),
          }),
          warnings: z.array(z.string()),
          meta: z
            .object({
              employeeIds: z.array(z.number()).optional(),
              projectContexts: z.array(
                z.object({
                  projectId: z.number(),
                  modelName: z.string(),
                  ovenName: z.string().nullable(),
                }),
              ),
            })
            .optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    listRuns: {
      method: "GET" as const,
      path: "/api/admin/demo-seed-runs",
      responses: {
        200: z.array(
          z.object({
            seedRunId: z.string(),
            createdAt: z.string(),
            runType: z.enum(["base", "appointments", "legacy"]).optional(),
            baseSeedRunId: z.string().optional(),
            dependentRunIds: z.array(z.string()).optional(),
            config: z.object({
              runType: z.enum(["base", "appointments", "legacy"]).optional(),
              baseSeedRunId: z.string().optional(),
              employees: z.number().optional(),
              customers: z.number().optional(),
              projects: z.number().optional(),
              appointmentsPerProject: z.number().optional(),
              generateAttachments: z.boolean().optional(),
              randomSeed: z.number().optional(),
              seedWindowDaysMin: z.number().optional(),
              seedWindowDaysMax: z.number().optional(),
              reklDelayDaysMin: z.number().optional(),
              reklDelayDaysMax: z.number().optional(),
              reklShare: z.number().optional(),
              locale: z.string().optional(),
            }),
            summary: z.object({
              seedRunId: z.string().optional(),
              createdAt: z.string().optional(),
              runType: z.enum(["base", "appointments", "legacy"]).optional(),
              baseSeedRunId: z.string().optional(),
              requested: z.object({
                employees: z.number(),
                customers: z.number(),
                projects: z.number(),
                appointmentsPerProject: z.number(),
                generateAttachments: z.boolean(),
                seedWindowDaysMin: z.number(),
                seedWindowDaysMax: z.number(),
                reklDelayDaysMin: z.number(),
                reklDelayDaysMax: z.number(),
                reklShare: z.number(),
                locale: z.string(),
              }),
              created: z.object({
                employees: z.number(),
                customers: z.number(),
                projects: z.number(),
                appointments: z.number(),
                mountAppointments: z.number(),
                reklAppointments: z.number(),
                notes: z.number(),
                noteTemplates: z.number(),
                teams: z.number(),
                tours: z.number(),
                attachments: z.number(),
              }),
              reductions: z.object({
                appointments: z.number(),
                reklMissingOven: z.number(),
                reklSkippedConstraints: z.number(),
              }),
              warnings: z.array(z.string()),
              meta: z
                .object({
                  projectContexts: z.array(
                    z.object({
                      projectId: z.number(),
                      modelName: z.string(),
                      ovenName: z.string().nullable(),
                    }),
                  ),
                  employeeIds: z.array(z.number()).optional(),
                })
                .optional(),
            }),
          }),
        ),
      },
    },
    purgeRun: {
      method: "DELETE" as const,
      path: "/api/admin/demo-seed-runs/:seedRunId",
      responses: {
        200: z.object({
          seedRunId: z.string(),
          deleted: z.object({
            appointments: z.number(),
            projects: z.number(),
            customers: z.number(),
            employees: z.number(),
            notes: z.number(),
            noteTemplates: z.number(),
            teams: z.number(),
            tours: z.number(),
            projectStatusRelations: z.number(),
            appointmentEmployees: z.number(),
            customerNotes: z.number(),
            projectNotes: z.number(),
            appointmentNotes: z.number(),
            attachments: z.number(),
            mappingRows: z.number(),
            seedRuns: z.number(),
          }),
          warnings: z.array(z.string()),
          noOp: z.boolean(),
        }),
        409: z.object({
          message: z.string(),
          dependentRunIds: z.array(z.string()),
        }),
      },
    },
  },
  admin: {
    resetDatabase: {
      method: "POST" as const,
      path: "/api/admin/reset-database",
      input: z.object({
        confirmPhrase: z.string().min(1),
        confirmed: z.boolean(),
      }),
      responses: {
        200: z.object({
          ok: z.literal(true),
          deleted: z.object({
            appointments: z.number(),
            noteTemplates: z.number(),
            helpTexts: z.number(),
            userSettingsValues: z.number(),
            backupLogs: z.number(),
            calendarSyncLogs: z.number(),
            projects: z.number(),
            projectOrderItems: z.number(),
            products: z.number(),
            productCategories: z.number(),
            components: z.number(),
            componentCategories: z.number(),
            productComponentLinks: z.number(),
            tags: z.number(),
            projectTags: z.number(),
            customerTags: z.number(),
            employeeTags: z.number(),
            customers: z.number(),
            teams: z.number(),
            tours: z.number(),
            notes: z.number(),
            seedRuns: z.number(),
            seedRunEntities: z.number(),
          }),
          attachments: z.object({
            filesDeleted: z.number(),
            filesMissing: z.number(),
          }),
          durationMs: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
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
  reports: {
    vorlaufliste: {
      list: {
        method: "GET" as const,
        path: "/api/reports/vorlaufliste",
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
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(100),
        }).strict(),
        responses: {
          200: reportVorlauflisteResponseSchema,
          403: z.object({ code: z.literal("FORBIDDEN") }),
          422: z.object({ code: z.literal("VALIDATION_ERROR") }),
        },
      },
    },
    productVorlauf: {
      list: {
        method: "GET" as const,
        path: "/api/reports/product-vorlauf",
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
        }).strict(),
        responses: {
          200: reportProductVorlaufResponseSchema,
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

export type ProjectStatusInput = z.infer<typeof api.projectStatus.create.input>;
export type ProjectStatusUpdateInput = z.infer<typeof api.projectStatus.update.input>;
export type ProjectStatusResponse = z.infer<typeof api.projectStatus.create.responses[201]>;

export type HelpTextInput = z.infer<typeof api.helpTexts.create.input>;
export type HelpTextUpdateInput = z.infer<typeof api.helpTexts.update.input>;
export type HelpTextResponse = z.infer<typeof api.helpTexts.create.responses[201]>;

export type EmployeeInput = z.infer<typeof api.employees.create.input>;
export type EmployeeUpdateInput = z.infer<typeof api.employees.update.input>;
export type EmployeeResponse = z.infer<typeof api.employees.create.responses[201]>;
export type EmployeeWithRelations = z.infer<typeof api.employees.get.responses[200]>;
export type EmployeeAbsenceInput = z.infer<typeof api.employees.absences.create.input>;
export type EmployeeAbsenceUpdateInput = z.infer<typeof api.employees.absences.update.input>;
export type EmployeeAbsenceResponse = z.infer<typeof api.employees.absences.create.responses[201]>;
export type AuthLoginResponse = z.infer<typeof api.auth.login.responses[200]>;
export type AuthenticatedResponse = z.infer<typeof api.auth.twoFactorVerify.responses[200]>;
export type UserSettingsResolvedResponse = z.infer<typeof api.userSettings.getResolved.responses[200]>;
export type MonitoringListResponse = z.infer<typeof api.monitoring.list.responses[200]>;
export type MonitoringConfigResponse = z.infer<typeof api.monitoring.adminConfigGet.responses[200]>;

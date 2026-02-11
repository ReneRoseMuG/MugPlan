import { z } from 'zod';
import { 
  insertTourSchema, updateTourSchema, tours, 
  insertTeamSchema, updateTeamSchema, teams,
  insertCustomerSchema, updateCustomerSchema, customers,
  insertNoteSchema, updateNoteSchema, notes,
  insertNoteTemplateSchema, updateNoteTemplateSchema, noteTemplates,
  insertProjectSchema, updateProjectSchema, projects,
  insertProjectAttachmentSchema, projectAttachments,
  insertCustomerAttachmentSchema, customerAttachments,
  insertEmployeeAttachmentSchema, employeeAttachments,
  insertProjectStatusSchema, updateProjectStatusSchema, projectStatus,
  insertEmployeeSchema, updateEmployeeSchema, employees,
  insertHelpTextSchema, updateHelpTextSchema, helpTexts
} from './schema';

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

export const api = {
  appointments: {
    get: {
      method: 'GET' as const,
      path: '/api/appointments/:id',
      responses: {
        200: z.object({
          id: z.number(),
          projectId: z.number(),
          tourId: z.number().nullable(),
          title: z.string(),
          description: z.string().nullable(),
          startDate: z.string(),
          startTime: z.string().nullable(),
          endDate: z.string().nullable(),
          endTime: z.string().nullable(),
          employees: z.array(z.custom<typeof employees.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments',
      input: z.object({
        projectId: z.number(),
        tourId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string().nullable().optional(),
        startTime: z.string().nullable().optional(),
        employeeIds: z.array(z.number()).optional(),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          projectId: z.number(),
          tourId: z.number().nullable(),
          title: z.string(),
          description: z.string().nullable(),
          startDate: z.string(),
          startTime: z.string().nullable(),
          endDate: z.string().nullable(),
          endTime: z.string().nullable(),
          employees: z.array(z.custom<typeof employees.$inferSelect>()),
        }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id',
      input: z.object({
        projectId: z.number(),
        tourId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string().nullable().optional(),
        startTime: z.string().nullable().optional(),
        employeeIds: z.array(z.number()).optional(),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          projectId: z.number(),
          tourId: z.number().nullable(),
          title: z.string(),
          description: z.string().nullable(),
          startDate: z.string(),
          startTime: z.string().nullable(),
          endDate: z.string().nullable(),
          endTime: z.string().nullable(),
          employees: z.array(z.custom<typeof employees.$inferSelect>()),
        }),
        400: errorSchemas.validation,
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/appointments/:id',
      responses: {
        204: z.void(),
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
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
            projectId: z.number(),
            projectName: z.string(),
            projectDescription: z.string().nullable(),
            projectStatuses: z.array(
              z.object({
                id: z.number(),
                title: z.string(),
                color: z.string(),
              }),
            ),
            startDate: z.string(),
            endDate: z.string().nullable(),
            startTime: z.string().nullable(),
            tourId: z.number().nullable(),
            tourName: z.string().nullable(),
            tourColor: z.string().nullable(),
            customer: z.object({
              id: z.number(),
              customerNumber: z.string(),
              fullName: z.string(),
              addressLine1: z.string().nullable().optional(),
              addressLine2: z.string().nullable().optional(),
              postalCode: z.string().nullable(),
              city: z.string().nullable(),
            }),
            project: z.object({
              id: z.number(),
              customerId: z.number(),
              name: z.string(),
              descriptionMd: z.string().nullable(),
              isActive: z.boolean(),
            }).optional(),
            employees: z.array(
              z.object({
                id: z.number(),
                fullName: z.string(),
              }),
            ),
            isLocked: z.boolean(),
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
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tours/:id',
      input: updateTourSchema,
      responses: {
        200: z.custom<typeof tours.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tours/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
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
      input: updateTeamSchema,
      responses: {
        200: z.custom<typeof teams.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/teams/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id',
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers',
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customers/:id',
      input: updateCustomerSchema,
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
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
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  notes: {
    update: {
      method: 'PUT' as const,
      path: '/api/notes/:noteId',
      input: updateNoteSchema,
      responses: {
        200: z.custom<typeof notes.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    togglePin: {
      method: 'PATCH' as const,
      path: '/api/notes/:noteId/pin',
      input: z.object({ isPinned: z.boolean() }),
      responses: {
        200: z.custom<typeof notes.$inferSelect>(),
        404: errorSchemas.notFound,
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
      input: updateNoteTemplateSchema,
      responses: {
        200: z.custom<typeof noteTemplates.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/note-templates/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  projectStatus: {
    list: {
      method: 'GET' as const,
      path: '/api/project-status',
      responses: {
        200: z.array(z.custom<typeof projectStatus.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/project-status',
      input: insertProjectStatusSchema,
      responses: {
        201: z.custom<typeof projectStatus.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/project-status/:id',
      input: updateProjectStatusSchema,
      responses: {
        200: z.custom<typeof projectStatus.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    toggleActive: {
      method: 'PATCH' as const,
      path: '/api/project-status/:id/active',
      input: z.object({ isActive: z.boolean() }),
      responses: {
        200: z.custom<typeof projectStatus.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/project-status/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
  },
  // Employees API (FT 05 - Mitarbeiterverwaltung)
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees',
      input: z.object({
        scope: z.enum(["active", "all"]).default("active"),
      }).strict(),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
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
    update: {
      method: 'PUT' as const,
      path: '/api/employees/:id',
      input: updateEmployeeSchema,
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    toggleActive: {
      method: 'PATCH' as const,
      path: '/api/employees/:id/active',
      input: z.object({ isActive: z.boolean() }),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    currentAppointments: {
      method: 'GET' as const,
      path: '/api/employees/:id/current-appointments',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          projectId: z.number(),
          title: z.string(),
          startDate: z.string(),
          endDate: z.string().nullable().optional(),
          startTimeHour: z.number().int().min(0).max(23).nullable().optional(),
          customerName: z.string().optional(),
        })),
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
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    assign: {
      method: 'POST' as const,
      path: '/api/tours/:tourId/employees',
      input: z.object({ employeeIds: z.array(z.number()) }),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
        400: errorSchemas.validation,
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
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    assign: {
      method: 'POST' as const,
      path: '/api/teams/:teamId/employees',
      input: z.object({ employeeIds: z.array(z.number()) }),
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
  },
  helpTexts: {
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
      input: updateHelpTextSchema,
      responses: {
        200: z.custom<typeof helpTexts.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
        409: z.object({ message: z.string() }),
      },
    },
    toggleActive: {
      method: 'PATCH' as const,
      path: '/api/help-texts/:id/active',
      input: z.object({ isActive: z.boolean() }),
      responses: {
        200: z.custom<typeof helpTexts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/help-texts/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
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
        statusIds: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional(),
        scope: z.enum(["upcoming", "noAppointments"]).default("upcoming"),
      }),
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.object({
          project: z.custom<typeof projects.$inferSelect>(),
          customer: z.custom<typeof customers.$inferSelect>(),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: updateProjectSchema,
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
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
      responses: {
        204: z.void(),
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
          startDate: z.string(),
          endDate: z.string().nullable(),
          startTimeHour: z.number().int().min(0).max(23).nullable(),
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
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/project-attachments/:id',
      responses: {
        405: errorSchemas.validation,
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
  projectStatusRelations: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/statuses',
      responses: {
        200: z.array(z.custom<typeof projectStatus.$inferSelect>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/statuses',
      input: z.object({ statusId: z.number() }),
      responses: {
        201: z.void(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/projects/:projectId/statuses/:statusId',
      responses: {
        204: z.void(),
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
    download: {
      method: 'GET' as const,
      path: '/api/customer-attachments/:id/download',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  demoSeed: {
    createRun: {
      method: "POST" as const,
      path: "/api/admin/demo-seed-runs",
      input: z.object({
        employees: z.number().int().min(1).max(500).default(20),
        customers: z.number().int().min(1).max(500).default(10),
        projects: z.number().int().min(1).max(1000).default(30),
        appointmentsPerProject: z.number().int().min(0).max(20).default(1),
        generateAttachments: z.boolean().default(true),
        randomSeed: z.number().int().optional(),
        seedWindowDaysMin: z.number().int().min(1).max(365).default(60).optional(),
        seedWindowDaysMax: z.number().int().min(1).max(365).default(90).optional(),
        reklDelayDaysMin: z.number().int().min(1).max(180).default(14).optional(),
        reklDelayDaysMax: z.number().int().min(1).max(365).default(42).optional(),
        reklShare: z.number().min(0).max(1).default(0.33).optional(),
        locale: z.string().default("de").optional(),
      }),
      responses: {
        201: z.object({
          seedRunId: z.string(),
          createdAt: z.string(),
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
            projectStatusRelations: z.number(),
            appointments: z.number(),
            mountAppointments: z.number(),
            reklAppointments: z.number(),
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
            config: z.object({
              employees: z.number(),
              customers: z.number(),
              projects: z.number(),
              appointmentsPerProject: z.number(),
              generateAttachments: z.boolean(),
              randomSeed: z.number().optional(),
              seedWindowDaysMin: z.number().optional(),
              seedWindowDaysMax: z.number().optional(),
              reklDelayDaysMin: z.number().optional(),
              reklDelayDaysMax: z.number().optional(),
              reklShare: z.number().optional(),
              locale: z.string().optional(),
            }),
            summary: z.object({
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
                projectStatusRelations: z.number(),
                appointments: z.number(),
                mountAppointments: z.number(),
                reklAppointments: z.number(),
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
            teams: z.number(),
            tours: z.number(),
            projectStatusRelations: z.number(),
            appointmentEmployees: z.number(),
            attachments: z.number(),
            mappingRows: z.number(),
            seedRuns: z.number(),
          }),
          warnings: z.array(z.string()),
          noOp: z.boolean(),
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
            noteTemplates: z.number(),
            helpTexts: z.number(),
            userSettingsValues: z.number(),
            projects: z.number(),
            customers: z.number(),
            employees: z.number(),
            projectStatuses: z.number(),
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
            type: z.enum(["enum", "string", "number"]),
            constraints: z.record(z.unknown()),
            allowedScopes: z.array(z.enum(["GLOBAL", "ROLE", "USER"])),
            defaultValue: z.unknown(),
            globalValue: z.unknown().optional(),
            roleValue: z.unknown().optional(),
            userValue: z.unknown().optional(),
            resolvedValue: z.unknown(),
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
        value: z.unknown(),
      }),
      responses: {
        200: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            description: z.string(),
            type: z.enum(["enum", "string", "number"]),
            constraints: z.record(z.unknown()),
            allowedScopes: z.array(z.enum(["GLOBAL", "ROLE", "USER"])),
            defaultValue: z.unknown(),
            globalValue: z.unknown().optional(),
            roleValue: z.unknown().optional(),
            userValue: z.unknown().optional(),
            resolvedValue: z.unknown(),
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
export type UserSettingsResolvedResponse = z.infer<typeof api.userSettings.getResolved.responses[200]>;


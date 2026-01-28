import { z } from 'zod';
import { 
  insertEventSchema, events, 
  insertTourSchema, updateTourSchema, tours, 
  insertTeamSchema, updateTeamSchema, teams,
  insertCustomerSchema, updateCustomerSchema, customers,
  insertNoteSchema, updateNoteSchema, notes,
  insertNoteTemplateSchema, updateNoteTemplateSchema, noteTemplates,
  insertProjectSchema, updateProjectSchema, projects,
  insertProjectAttachmentSchema, projectAttachments,
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
  events: {
    list: {
      method: 'GET' as const,
      path: '/api/events',
      responses: {
        200: z.array(z.custom<typeof events.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/events',
      input: insertEventSchema,
      responses: {
        201: z.custom<typeof events.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/events/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
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
          title: z.string(),
          date: z.string(),
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
      input: insertNoteSchema,
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
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
        204: z.void(),
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

export type EventInput = z.infer<typeof api.events.create.input>;
export type EventResponse = z.infer<typeof api.events.create.responses[201]>;

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

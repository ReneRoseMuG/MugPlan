import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as customersRepository from "../repositories/customersRepository";
import * as projectsRepository from "../repositories/projectsRepository";
import * as attachmentQueriesRepository from "../repositories/attachmentQueriesRepository";

export async function checkAttachmentDuplicatesByOriginalName(originalName: string) {
  const hits = await attachmentQueriesRepository.findDuplicateAttachmentsByOriginalName(originalName);
  const summary = {
    customer: hits.filter((hit) => hit.domain === "customer").length,
    project: hits.filter((hit) => hit.domain === "project").length,
    employee: hits.filter((hit) => hit.domain === "employee").length,
  };

  return {
    duplicate: hits.length > 0,
    summary,
    hits: hits.map((hit) => ({
      ...hit,
      createdAt: hit.createdAt.toISOString(),
    })),
  };
}

export async function listCustomerProjectAttachmentGroups(params: {
  customerId: number;
  page: number;
  pageSize: number;
}) {
  return attachmentQueriesRepository.getCustomerProjectAttachmentGroups(params);
}

export async function getAppointmentAttachmentContext(appointmentId: number): Promise<{
  appointmentId: number;
  project: {
    id: number;
    name: string;
    orderNumber: string | null;
  };
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
  };
  projectAttachments: Awaited<ReturnType<typeof projectsRepository.getProjectAttachments>>;
  customerAttachments: Awaited<ReturnType<typeof customersRepository.getCustomerAttachments>>;
} | null> {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;

  const projectWithCustomer = await projectsRepository.getProjectWithCustomer(appointment.projectId);
  if (!projectWithCustomer) return null;

  const [projectAttachments, customerAttachments] = await Promise.all([
    projectsRepository.getProjectAttachments(projectWithCustomer.project.id),
    customersRepository.getCustomerAttachments(projectWithCustomer.customer.id),
  ]);

  return {
    appointmentId,
    project: {
      id: projectWithCustomer.project.id,
      name: projectWithCustomer.project.name,
      orderNumber: projectWithCustomer.project.orderNumber ?? null,
    },
    customer: {
      id: projectWithCustomer.customer.id,
      customerNumber: projectWithCustomer.customer.customerNumber,
      fullName: projectWithCustomer.customer.fullName ?? null,
    },
    projectAttachments,
    customerAttachments,
  };
}

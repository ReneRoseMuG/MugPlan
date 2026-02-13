import type { Express } from "express";
import type { Server } from "http";
import { attachRequestUserContext } from "./middleware/requestUserContext";
import { resolveUserRole } from "./middleware/resolveUserRole";
import adminRoutes from "./routes/adminRoutes";
import customerNotesRoutes from "./routes/customerNotesRoutes";
import customerAttachmentsRoutes from "./routes/customerAttachmentsRoutes";
import customersRoutes from "./routes/customersRoutes";
import employeeAttachmentsRoutes from "./routes/employeeAttachmentsRoutes";
import employeesRoutes from "./routes/employeesRoutes";
import helpTextsRoutes from "./routes/helpTextsRoutes";
import noteTemplatesRoutes from "./routes/noteTemplatesRoutes";
import notesRoutes from "./routes/notesRoutes";
import appointmentsRoutes from "./routes/appointmentsRoutes";
import demoSeedRoutes from "./routes/demoSeedRoutes";
import projectAttachmentsRoutes from "./routes/projectAttachmentsRoutes";
import projectNotesRoutes from "./routes/projectNotesRoutes";
import projectStatusRelationsRoutes from "./routes/projectStatusRelationsRoutes";
import projectStatusRoutes from "./routes/projectStatusRoutes";
import projectsRoutes from "./routes/projectsRoutes";
import teamEmployeesRoutes from "./routes/teamEmployeesRoutes";
import teamsRoutes from "./routes/teamsRoutes";
import tourEmployeesRoutes from "./routes/tourEmployeesRoutes";
import toursRoutes from "./routes/toursRoutes";
import userSettingsRoutes from "./routes/userSettingsRoutes";
import usersRoutes from "./routes/usersRoutes";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use("/api", attachRequestUserContext);
  app.use("/api", resolveUserRole);

  app.use(adminRoutes);
  app.use(appointmentsRoutes);
  app.use(demoSeedRoutes);
  app.use(toursRoutes);
  app.use(teamsRoutes);
  app.use(customersRoutes);
  app.use(customerNotesRoutes);
  app.use(customerAttachmentsRoutes);
  app.use(notesRoutes);
  app.use(noteTemplatesRoutes);
  app.use(projectStatusRoutes);
  app.use(helpTextsRoutes);
  app.use(employeesRoutes);
  app.use(employeeAttachmentsRoutes);
  app.use(tourEmployeesRoutes);
  app.use(teamEmployeesRoutes);
  app.use(projectsRoutes);
  app.use(projectNotesRoutes);
  app.use(projectAttachmentsRoutes);
  app.use(projectStatusRelationsRoutes);
  app.use(userSettingsRoutes);
  app.use(usersRoutes);

  return httpServer;
}

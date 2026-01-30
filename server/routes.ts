import type { Express } from "express";
import type { Server } from "http";
import customerNotesRoutes from "./routes/customerNotesRoutes";
import customersRoutes from "./routes/customersRoutes";
import employeesRoutes from "./routes/employeesRoutes";
import eventsRoutes from "./routes/eventsRoutes";
import helpTextsRoutes from "./routes/helpTextsRoutes";
import noteTemplatesRoutes from "./routes/noteTemplatesRoutes";
import notesRoutes from "./routes/notesRoutes";
import projectAttachmentsRoutes from "./routes/projectAttachmentsRoutes";
import projectNotesRoutes from "./routes/projectNotesRoutes";
import projectStatusRelationsRoutes from "./routes/projectStatusRelationsRoutes";
import projectStatusRoutes from "./routes/projectStatusRoutes";
import projectsRoutes from "./routes/projectsRoutes";
import teamEmployeesRoutes from "./routes/teamEmployeesRoutes";
import teamsRoutes from "./routes/teamsRoutes";
import tourEmployeesRoutes from "./routes/tourEmployeesRoutes";
import toursRoutes from "./routes/toursRoutes";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(eventsRoutes);
  app.use(toursRoutes);
  app.use(teamsRoutes);
  app.use(customersRoutes);
  app.use(customerNotesRoutes);
  app.use(notesRoutes);
  app.use(noteTemplatesRoutes);
  app.use(projectStatusRoutes);
  app.use(helpTextsRoutes);
  app.use(employeesRoutes);
  app.use(tourEmployeesRoutes);
  app.use(teamEmployeesRoutes);
  app.use(projectsRoutes);
  app.use(projectNotesRoutes);
  app.use(projectAttachmentsRoutes);
  app.use(projectStatusRelationsRoutes);

  return httpServer;
}

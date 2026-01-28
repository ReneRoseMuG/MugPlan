import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Events API (Minimal implementation, unused by default as per requirements)
  app.get(api.events.list.path, async (req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.post(api.events.create.path, async (req, res) => {
    try {
      const input = api.events.create.input.parse(req.body);
      const event = await storage.createEvent(input);
      res.status(201).json(event);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.events.delete.path, async (req, res) => {
    await storage.deleteEvent(Number(req.params.id));
    res.status(204).send();
  });

  // Tours API
  app.get(api.tours.list.path, async (req, res) => {
    const tours = await storage.getTours();
    res.json(tours);
  });

  app.post(api.tours.create.path, async (req, res) => {
    try {
      const input = api.tours.create.input.parse(req.body);
      const tour = await storage.createTour(input);
      res.status(201).json(tour);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.tours.update.path, async (req, res) => {
    try {
      const input = api.tours.update.input.parse(req.body);
      const tour = await storage.updateTour(Number(req.params.id), input);
      if (!tour) {
        return res.status(404).json({ message: 'Tour not found' });
      }
      res.json(tour);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.tours.delete.path, async (req, res) => {
    await storage.deleteTour(Number(req.params.id));
    res.status(204).send();
  });

  // Teams API
  app.get(api.teams.list.path, async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });

  app.post(api.teams.create.path, async (req, res) => {
    try {
      const input = api.teams.create.input.parse(req.body);
      const team = await storage.createTeam(input);
      res.status(201).json(team);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.teams.update.path, async (req, res) => {
    try {
      const input = api.teams.update.input.parse(req.body);
      const team = await storage.updateTeam(Number(req.params.id), input);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json(team);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.teams.delete.path, async (req, res) => {
    await storage.deleteTeam(Number(req.params.id));
    res.status(204).send();
  });

  // Customers API (FT 09 - Kundenverwaltung)
  app.get(api.customers.list.path, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get(api.customers.get.path, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      res.status(201).json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.customers.update.path, async (req, res) => {
    try {
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(Number(req.params.id), input);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Customer Notes API (FT 13 - Notizverwaltung)
  app.get(api.customerNotes.list.path, async (req, res) => {
    const customerId = Number(req.params.customerId);
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const notes = await storage.getCustomerNotes(customerId);
    res.json(notes);
  });

  app.post(api.customerNotes.create.path, async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      const input = api.customerNotes.create.input.parse(req.body);
      let noteData = { title: input.title, body: input.body };
      
      if (input.templateId) {
        const template = await storage.getNoteTemplate(input.templateId);
        if (template) {
          noteData = { title: template.title, body: template.body };
        }
      }
      
      const note = await storage.createCustomerNote(customerId, noteData);
      res.status(201).json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.customerNotes.delete.path, async (req, res) => {
    const noteId = Number(req.params.noteId);
    await storage.deleteNote(noteId);
    res.status(204).send();
  });

  // Notes API (FT 13)
  app.put(api.notes.update.path, async (req, res) => {
    try {
      const noteId = Number(req.params.noteId);
      const input = api.notes.update.input.parse(req.body);
      const note = await storage.updateNote(noteId, input);
      if (!note) {
        return res.status(404).json({ message: 'Note not found' });
      }
      res.json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.notes.togglePin.path, async (req, res) => {
    try {
      const noteId = Number(req.params.noteId);
      const input = api.notes.togglePin.input.parse(req.body);
      const note = await storage.toggleNotePin(noteId, input.isPinned);
      if (!note) {
        return res.status(404).json({ message: 'Note not found' });
      }
      res.json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Note Templates API (FT 13)
  app.get(api.noteTemplates.list.path, async (req, res) => {
    const activeOnly = req.query.active !== 'false';
    const templates = await storage.getNoteTemplates(activeOnly);
    res.json(templates);
  });

  app.post(api.noteTemplates.create.path, async (req, res) => {
    try {
      const input = api.noteTemplates.create.input.parse(req.body);
      const template = await storage.createNoteTemplate(input);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.noteTemplates.update.path, async (req, res) => {
    try {
      const templateId = Number(req.params.id);
      const input = api.noteTemplates.update.input.parse(req.body);
      const template = await storage.updateNoteTemplate(templateId, input);
      if (!template) {
        return res.status(404).json({ message: 'Note template not found' });
      }
      res.json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.noteTemplates.delete.path, async (req, res) => {
    await storage.deleteNoteTemplate(Number(req.params.id));
    res.status(204).send();
  });

  // Project Status API (FT 15 - Projektstatusverwaltung)
  app.get(api.projectStatus.list.path, async (req, res) => {
    const activeParam = req.query.active as string | undefined;
    let filter: 'active' | 'inactive' | 'all' = 'active';
    if (activeParam === 'false') filter = 'inactive';
    if (activeParam === 'all') filter = 'all';
    const statuses = await storage.getProjectStatuses(filter);
    res.json(statuses);
  });

  app.post(api.projectStatus.create.path, async (req, res) => {
    try {
      const input = api.projectStatus.create.input.parse(req.body);
      const status = await storage.createProjectStatus(input);
      res.status(201).json(status);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.projectStatus.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.projectStatus.update.input.parse(req.body);
      const result = await storage.updateProjectStatus(id, input);
      if (result.error) {
        if (result.error === 'Status nicht gefunden') {
          return res.status(404).json({ message: result.error });
        }
        return res.status(400).json({ message: result.error });
      }
      res.json(result.status);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.projectStatus.toggleActive.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.projectStatus.toggleActive.input.parse(req.body);
      
      const existing = await storage.getProjectStatus(id);
      if (!existing) {
        return res.status(404).json({ message: 'Projektstatus nicht gefunden' });
      }
      if (existing.isDefault && !input.isActive) {
        return res.status(400).json({ message: 'Default-Status kann nicht deaktiviert werden' });
      }
      
      const status = await storage.toggleProjectStatusActive(id, input.isActive);
      if (!status) {
        return res.status(404).json({ message: 'Projektstatus nicht gefunden' });
      }
      res.json(status);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.projectStatus.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const result = await storage.deleteProjectStatus(id);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.status(204).send();
  });

  // Help Texts (FT 16)
  app.get(api.helpTexts.getByKey.path, async (req, res) => {
    const helpKey = req.params.helpKey as string;
    const helpText = await storage.getHelpTextByKey(helpKey);
    if (!helpText) {
      return res.json(null);
    }
    res.json({
      helpKey: helpText.helpKey,
      title: helpText.title,
      body: helpText.body,
    });
  });

  app.get(api.helpTexts.list.path, async (req, res) => {
    const query = req.query.query as string | undefined;
    const helpTexts = await storage.getHelpTexts(query);
    res.json(helpTexts);
  });

  app.get(api.helpTexts.getById.path, async (req, res) => {
    const id = Number(req.params.id);
    const helpText = await storage.getHelpTextById(id);
    if (!helpText) {
      return res.status(404).json({ message: 'Hilfetext nicht gefunden' });
    }
    res.json(helpText);
  });

  app.post(api.helpTexts.create.path, async (req, res) => {
    try {
      const input = api.helpTexts.create.input.parse(req.body);
      const result = await storage.createHelpText(input);
      if (result.error) {
        return res.status(409).json({ message: result.error });
      }
      res.status(201).json(result.helpText);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.helpTexts.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.helpTexts.update.input.parse(req.body);
      const result = await storage.updateHelpText(id, input);
      if (result.error) {
        if (result.error === 'Hilfetext nicht gefunden') {
          return res.status(404).json({ message: result.error });
        }
        return res.status(409).json({ message: result.error });
      }
      res.json(result.helpText);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.helpTexts.toggleActive.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.helpTexts.toggleActive.input.parse(req.body);
      const helpText = await storage.toggleHelpTextActive(id, input.isActive);
      if (!helpText) {
        return res.status(404).json({ message: 'Hilfetext nicht gefunden' });
      }
      res.json(helpText);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.helpTexts.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getHelpTextById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Hilfetext nicht gefunden' });
    }
    await storage.deleteHelpText(id);
    res.status(204).send();
  });

  // Employees API (FT 05 - Mitarbeiterverwaltung)
  app.get(api.employees.list.path, async (req, res) => {
    const activeParam = req.query.active as string | undefined;
    let filter: 'active' | 'inactive' | 'all' = 'active';
    if (activeParam === 'false') filter = 'inactive';
    if (activeParam === 'all') filter = 'all';
    const employees = await storage.getEmployees(filter);
    res.json(employees);
  });

  app.get(api.employees.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const result = await storage.getEmployeeWithRelations(id);
    if (!result) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }
    res.json(result);
  });

  app.post(api.employees.create.path, async (req, res) => {
    try {
      // Validate that team_id and tour_id are not provided
      if (req.body.teamId !== undefined || req.body.tourId !== undefined) {
        return res.status(400).json({ 
          message: 'team_id und tour_id können nicht über die Mitarbeiter-API gesetzt werden. Bitte nutzen Sie die Team- oder Tour-Verwaltung.'
        });
      }
      const input = api.employees.create.input.parse(req.body);
      const employee = await storage.createEmployee(input);
      res.status(201).json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.employees.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      // Validate that team_id and tour_id are not provided
      if (req.body.teamId !== undefined || req.body.tourId !== undefined) {
        return res.status(400).json({ 
          message: 'team_id und tour_id können nicht über die Mitarbeiter-API geändert werden. Bitte nutzen Sie die Team- oder Tour-Verwaltung.'
        });
      }
      const input = api.employees.update.input.parse(req.body);
      const employee = await storage.updateEmployee(id, input);
      if (!employee) {
        return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
      }
      res.json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.employees.toggleActive.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.employees.toggleActive.input.parse(req.body);
      const employee = await storage.toggleEmployeeActive(id, input.isActive);
      if (!employee) {
        return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
      }
      res.json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Demo-Terminliste (read-only stub)
  app.get(api.employees.currentAppointments.path, async (req, res) => {
    // Stub endpoint für spätere echte Termin-Anbindung
    // Gibt vorerst Demo-Daten zurück
    res.json([]);
  });

  // Tour Employees API
  app.get(api.tourEmployees.list.path, async (req, res) => {
    const tourId = Number(req.params.tourId);
    const employees = await storage.getEmployeesByTour(tourId);
    res.json(employees);
  });

  app.delete(api.tourEmployees.remove.path, async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const employee = await storage.setEmployeeTour(employeeId, null);
    if (!employee) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }
    res.json(employee);
  });

  app.post(api.tourEmployees.assign.path, async (req, res) => {
    try {
      const tourId = Number(req.params.tourId);
      const input = api.tourEmployees.assign.input.parse(req.body);
      
      // Get current employees assigned to this tour
      const currentEmployees = await storage.getEmployeesByTour(tourId);
      const currentIds = currentEmployees.map(e => e.id);
      const newIds = input.employeeIds;
      
      // Remove employees no longer in the list
      const toRemove = currentIds.filter(id => !newIds.includes(id));
      for (const employeeId of toRemove) {
        await storage.setEmployeeTour(employeeId, null);
      }
      
      // Add new employees to this tour
      const results: any[] = [];
      for (const employeeId of newIds) {
        const employee = await storage.setEmployeeTour(employeeId, tourId);
        if (employee) results.push(employee);
      }
      res.json(results);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Team Employees API
  app.get(api.teamEmployees.list.path, async (req, res) => {
    const teamId = Number(req.params.teamId);
    const employees = await storage.getEmployeesByTeam(teamId);
    res.json(employees);
  });

  app.delete(api.teamEmployees.remove.path, async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const employee = await storage.setEmployeeTeam(employeeId, null);
    if (!employee) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }
    res.json(employee);
  });

  app.post(api.teamEmployees.assign.path, async (req, res) => {
    try {
      const teamId = Number(req.params.teamId);
      const input = api.teamEmployees.assign.input.parse(req.body);
      
      // Get current employees assigned to this team
      const currentEmployees = await storage.getEmployeesByTeam(teamId);
      const currentIds = currentEmployees.map(e => e.id);
      const newIds = input.employeeIds;
      
      // Remove employees no longer in the list
      const toRemove = currentIds.filter(id => !newIds.includes(id));
      for (const employeeId of toRemove) {
        await storage.setEmployeeTeam(employeeId, null);
      }
      
      // Add new employees to this team
      const results: any[] = [];
      for (const employeeId of newIds) {
        const employee = await storage.setEmployeeTeam(employeeId, teamId);
        if (employee) results.push(employee);
      }
      res.json(results);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}

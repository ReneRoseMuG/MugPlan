import { Router } from "express";
import { api } from "@shared/routes";
import * as teamsController from "../controllers/teamsController";

const router = Router();

router.get(api.teams.list.path, teamsController.listTeams);
router.post(api.teams.create.path, teamsController.createTeam);
router.patch(api.teams.update.path, teamsController.updateTeam);
router.delete(api.teams.delete.path, teamsController.deleteTeam);

export default router;

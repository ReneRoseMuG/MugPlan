import { Router } from "express";
import * as dataVersionService from "../services/dataVersionService";

const router = Router();

router.get("/api/data-version", async (req, res, next) => {
  try {
    const version = await dataVersionService.getDataVersion();
    res.json(version);
  } catch (err) {
    next(err);
  }
});

export default router;

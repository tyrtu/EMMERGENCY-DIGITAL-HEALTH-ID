// backend/src/routes/llmTriageRoutes.js
import express from "express";
import { llmTriage } from "../controllers/llmTriageController.js";

const router = express.Router();
router.post("/", llmTriage);

export default router;

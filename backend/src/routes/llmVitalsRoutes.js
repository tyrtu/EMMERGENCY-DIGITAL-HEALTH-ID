import express from "express";
import { llmVitals } from "../controllers/llmVitalsController.js";

const router = express.Router();
router.post("/", llmVitals);

export default router;

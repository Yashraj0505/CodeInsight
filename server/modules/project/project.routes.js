import express from "express";
import {
  create,
  getAll,
  remove,
} from "./project.controller.js";

import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, create);
router.get("/", protect, getAll);
router.delete("/:id", protect, remove);

export default router;
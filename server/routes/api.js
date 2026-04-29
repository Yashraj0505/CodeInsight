import express from "express";
import multer from "multer";
import { uploadProject, uploadProjectGithub, getProjects, deleteProject, getStructure, getFileAnalysis } from "../controllers/projectController.js";
import { askQuestion } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1MB per file, 50MB total request — matches fileFilters.MAX_FILE_SIZE
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024, files: 500 },
});

router.post("/project/upload",                protect, upload.array("files"), uploadProject);
router.post("/project/github",                protect, uploadProjectGithub);
router.get("/projects",                       protect, getProjects);
router.delete("/project/:projectId",          protect, deleteProject);
router.get("/project/:projectId/structure",   protect, getStructure);
router.get("/project/:projectId/file/:fileId", protect, getFileAnalysis);
router.post("/chat",                          protect, askQuestion);

export default router;

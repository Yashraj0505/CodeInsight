import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeFile } from "./codeAnalyzer.js";
import { shouldIgnore, MAX_FILES } from "../utils/fileFilters.js";
import Project from "../modules/project/project.model.js";
import File from "../models/File.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Recursively collect all files under a directory
const collectFiles = (dir, baseDir, fileDocs, projectId) => {
  if (fileDocs.length >= MAX_FILES) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (fileDocs.length >= MAX_FILES) break;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      collectFiles(fullPath, baseDir, fileDocs, projectId);
    } else {
      const stat = fs.statSync(fullPath);
      if (shouldIgnore(relativePath, stat.size)) continue;

      const content = fs.readFileSync(fullPath, "utf8");
      fileDocs.push({
        projectId,
        name: entry.name,
        path: relativePath,
        savedPath: fullPath,
        analysis: analyzeFile(content, entry.name),
      });
    }
  }
};

export const reindexUploads = async () => {
  if (!fs.existsSync(UPLOADS_DIR)) return;

  const projectFolders = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (projectFolders.length === 0) return;

  console.log(`🔍 Reindexer: found ${projectFolders.length} folder(s) in uploads/`);

  for (const folderId of projectFolders) {
    const projectDir = path.join(UPLOADS_DIR, folderId);

    // Check if this project already exists in DB
    let project;
    try {
      project = await Project.findById(folderId);
    } catch {
      // folderId is not a valid ObjectId — it's a legacy UUID folder, create fresh
      project = null;
    }

    if (project) {
      console.log(`⏭️  Skipped existing project: ${folderId}`);
      continue;
    }

    // Read original name and uploadTime from metadata file if available
    const metaPath = path.join(projectDir, ".codeinsight.json");
    const stat = fs.statSync(projectDir);
    let projectName = `Reindexed-${folderId.substring(0, 8)}`;
    let uploadTime = stat.birthtimeMs || stat.ctimeMs;

    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (meta.name) projectName = meta.name;
        if (meta.uploadTime) uploadTime = meta.uploadTime;
      } catch { /* ignore malformed metadata */ }
    }

    // Create project document
    const newProject = await Project.create({ name: projectName, uploadTime });

    // Collect and insert all files
    const fileDocs = [];
    collectFiles(projectDir, projectDir, fileDocs, newProject._id);

    if (fileDocs.length > 0) {
      await File.insertMany(fileDocs);
    }

    await Project.findByIdAndUpdate(newProject._id, { fileCount: fileDocs.length });

    console.log(`✅ Reindexed project: ${folderId} → ${fileDocs.length} file(s)`);
  }
};

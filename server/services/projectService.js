import fs from "fs";
import path from "path";
import { shouldIgnore, MAX_FILES } from "../utils/fileFilters.js";
import { analyzeFile } from "./codeAnalyzer.js";
import { uploadFile } from "./storageService.js";
import File from "../models/File.js";
import Project from "../modules/project/project.model.js";

/**
 * Processes a project directory: uploads each file to Cloudinary,
 * analyzes it, and stores metadata in MongoDB.
 * @param {string} folderPath - Temporary local path of the extracted project.
 * @param {object} project - The Project document from MongoDB.
 * @returns {Promise<number>} Count of processed files.
 */
export const processProject = async (folderPath, project) => {
  const projectId = project._id.toString();
  const fileList = [];

  const traverse = (dir) => {
    if (fileList.length >= MAX_FILES) return;
    for (const item of fs.readdirSync(dir)) {
      if (fileList.length >= MAX_FILES) break;
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, "/");
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        if (!shouldIgnore(relativePath)) traverse(fullPath);
      } else if (!shouldIgnore(relativePath, stats.size)) {
        fileList.push({ name: item, relativePath, fullPath });
      }
    }
  };

  traverse(folderPath);

  const fileDocs = await Promise.all(
    fileList.map(async ({ name, relativePath, fullPath }) => {
      try {
        const buffer = fs.readFileSync(fullPath);
        const content = buffer.toString("utf8");
        const storagePath = `${projectId}/${relativePath}`;
        const url = await uploadFile(buffer, storagePath);
        return {
          projectId,
          name,
          path: relativePath,
          url,
          analysis: analyzeFile(content, name),
        };
      } catch (err) {
        console.error(`Error processing file ${relativePath}:`, err.message);
        return null;
      }
    })
  );

  const validFiles = fileDocs.filter(Boolean);
  if (validFiles.length > 0) await File.insertMany(validFiles);
  await Project.findByIdAndUpdate(projectId, { fileCount: validFiles.length });

  return validFiles.length;
};

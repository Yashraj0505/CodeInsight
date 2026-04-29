import fs from "fs";
import path from "path";
import { shouldIgnore, MAX_FILES } from "../utils/fileFilters.js";
import { analyzeFile } from "./codeAnalyzer.js";
import File from "../models/File.js";
import Project from "../modules/project/project.model.js";

/**
 * Recursively processes a project directory, analyzes files, and stores metadata in DB.
 * @param {string} folderPath - Path to the extracted/uploaded project folder.
 * @param {object} project - The Project document from MongoDB.
 * @returns {Promise<number>} - Count of processed files.
 */
export const processProject = async (folderPath, project) => {
    const fileList = [];
    const projectId = project._id;

    const traverse = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (fileList.length >= MAX_FILES) break;

            const fullPath = path.join(dir, item);
            const relativePath = path.relative(folderPath, fullPath);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                if (!shouldIgnore(relativePath)) {
                    traverse(fullPath);
                }
            } else {
                if (!shouldIgnore(relativePath, stats.size)) {
                    fileList.push({
                        name: item,
                        path: relativePath,
                        savedPath: fullPath,
                        size: stats.size
                    });
                }
            }
        }
    };

    // 1. Traverse and collect files
    traverse(folderPath);

    // 2. Process files in parallel
    const fileDocs = await Promise.all(
        fileList.map(async (fileInfo) => {
            try {
                const content = fs.readFileSync(fileInfo.savedPath, "utf8");
                // Simple check for text content (optional but good practice)
                // For now, shouldIgnore extension check is primary filter
                return {
                    projectId,
                    name: fileInfo.name,
                    path: fileInfo.path,
                    savedPath: fileInfo.savedPath,
                    analysis: analyzeFile(content, fileInfo.name),
                };
            } catch (err) {
                console.error(`Error processing file ${fileInfo.path}:`, err);
                return null;
            }
        })
    );

    // 3. Filter out any failed processes
    const validFiles = fileDocs.filter(Boolean);

    // 4. Store in MongoDB
    if (validFiles.length > 0) {
        await File.insertMany(validFiles);
    }

    await Project.findByIdAndUpdate(projectId, { fileCount: validFiles.length });

    // 5. Save metadata for reindexing/status
    fs.writeFileSync(
        path.join(folderPath, ".codeinsight.json"),
        JSON.stringify({
            name: project.name,
            uploadTime: project.uploadTime,
            fileCount: validFiles.length
        })
    );

    return validFiles.length;
};

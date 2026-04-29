import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import axios from "axios";
import { pipeline } from "stream/promises";
import mongoose from "mongoose";
import { processProject } from "../services/projectService.js";
import { deleteProjectFiles } from "../services/storageService.js";
import Project from "../modules/project/project.model.js";
import File from "../models/File.js";
import asyncHandler from "../utils/asyncHandler.js";
import { MAX_FILES, MAX_FILE_SIZE } from "../utils/fileFilters.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeFilename = (name) =>
  path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, "_");

const hasDotDot = (p) => p.split(/[\\\/]/).some((seg) => seg === "..");

// ── helpers ──────────────────────────────────────────────────────────────────

/** Creates a unique temp directory and returns its path. */
const makeTempDir = () => {
  const dir = path.join(os.tmpdir(), `codeinsight-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/** Removes a temp directory silently. */
const cleanTemp = (dir) => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
};

// ── controllers ──────────────────────────────────────────────────────────────

export const uploadProject = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: "No files provided" });

  if (req.files.length > MAX_FILES)
    return res.status(400).json({ error: `Exceeds max file limit of ${MAX_FILES}` });

  for (const f of req.files) {
    if (f.size > MAX_FILE_SIZE)
      return res.status(400).json({ error: `File "${f.originalname}" exceeds the 1MB size limit` });
  }

  const projectName = req.body.projectName?.trim() || `Project-${Date.now()}`;
  const project = await Project.create({ name: projectName, userId: req.user.uid, uploadTime: Date.now() });

  const tempDir = makeTempDir();
  try {
    if (req.files.length === 1 && req.files[0].originalname.endsWith(".zip")) {
      const zip = new AdmZip(req.files[0].buffer);
      zip.extractAllTo(tempDir, true);
    } else {
      const paths = req.body.paths ? JSON.parse(req.body.paths) : [];
      req.files.forEach((file, index) => {
        const rawPath = paths[index] || file.originalname;
        if (hasDotDot(rawPath)) return;
        const safePath = rawPath.split(/[\\\/]/).map(sanitizeFilename).join(path.sep);
        const fullPath = path.join(tempDir, safePath);
        if (!fullPath.startsWith(tempDir)) return;
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.buffer);
      });
    }

    const count = await processProject(tempDir, project);
    res.json({ message: "Project uploaded successfully", projectId: project._id.toString(), count });
  } catch (err) {
    await Project.findByIdAndDelete(project._id).catch(() => {});
    throw err;
  } finally {
    cleanTemp(tempDir);
  }
});

export const uploadProjectGithub = asyncHandler(async (req, res) => {
  const { repoUrl, projectName: projectNameReq } = req.body;

  if (!repoUrl) return res.status(400).json({ error: "Repository URL is required" });
  if (!repoUrl.includes("github.com"))
    return res.status(400).json({ error: "URL must be a valid GitHub repository URL" });

  const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (!repoMatch) return res.status(400).json({ error: "Invalid GitHub URL format" });

  const [, user, repoRaw] = repoMatch;
  const cleanRepoName = repoRaw.replace(/\.git$/, "");
  const zipUrl = `https://api.github.com/repos/${user}/${cleanRepoName}/zipball`;
  const projectName = projectNameReq?.trim() || cleanRepoName;

  const project = await Project.create({ name: projectName, userId: req.user.uid, uploadTime: Date.now() });

  const tempDir = makeTempDir();
  const tempZipPath = path.join(tempDir, "repo.zip");

  try {
    const response = await axios({
      method: "get",
      url: zipUrl,
      responseType: "stream",
      headers: { "User-Agent": "CodeInsight-Ingestion-System" },
    });

    await pipeline(response.data, fs.createWriteStream(tempZipPath));

    const zip = new AdmZip(tempZipPath);
    const extractDir = path.join(tempDir, "extracted");
    fs.mkdirSync(extractDir);
    zip.extractAllTo(extractDir, true);

    // Unwrap GitHub's root wrapper folder
    const dirs = fs.readdirSync(extractDir);
    const projectDir =
      dirs.length === 1 && fs.statSync(path.join(extractDir, dirs[0])).isDirectory()
        ? path.join(extractDir, dirs[0])
        : extractDir;

    const count = await processProject(projectDir, project);
    res.json({ message: "GitHub repository imported successfully", projectId: project._id.toString(), count });
  } catch (err) {
    await Project.findByIdAndDelete(project._id).catch(() => {});
    throw err;
  } finally {
    cleanTemp(tempDir);
  }
});

export const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ userId: req.user.uid }).sort({ uploadTime: -1 }).lean();
  res.json(
    projects.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      fileCount: p.fileCount || 0,
      uploadTime: p.uploadTime || new Date(p.createdAt).getTime(),
    }))
  );
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!isValidObjectId(projectId))
    return res.status(400).json({ error: "Invalid project ID" });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  await project.deleteOne();
  await File.deleteMany({ projectId });
  await deleteProjectFiles(`projects/${projectId}/`).catch(() => {});

  res.json({ success: true, message: "Project deleted" });
});

export const getStructure = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!isValidObjectId(projectId))
    return res.status(400).json({ error: "Invalid project ID" });

  const project = await Project.findById(projectId).lean();
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  const files = await File.find({ projectId }).lean();
  res.json(files.map((f) => ({ id: f._id, path: f.path, name: f.name })));
});

export const getFileAnalysis = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;
  if (!isValidObjectId(projectId))
    return res.status(400).json({ error: "Invalid project ID" });
  if (!isValidObjectId(fileId))
    return res.status(400).json({ error: "Invalid file ID" });

  const file = await File.findById(fileId).lean();
  if (!file) return res.status(404).json({ error: "File not found" });
  if (file.projectId.toString() !== projectId)
    return res.status(403).json({ error: "Forbidden" });

  const project = await Project.findById(projectId).lean();
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.userId !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  let content = null;
  try {
    const response = await axios.get(file.url, { responseType: "text", timeout: 10000 });
    content = response.data;
  } catch {
    content = null;
  }

  const explanation = `This is the file ${file.name}. It contains ${file.analysis.functions.length} function(s) and ${file.analysis.classes.length} class(es). It has ${file.analysis.imports.length} imports.`;

  res.json({ ...file, id: file._id, content, explanation });
});

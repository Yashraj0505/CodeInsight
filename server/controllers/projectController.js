import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";
import axios from "axios";
import { pipeline } from "stream/promises";
import { processProject } from "../services/projectService.js";
import Project from "../modules/project/project.model.js";
import File from "../models/File.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uploadProject = async (req, res) => {
  try {
    const projectName = req.body.projectName || `Project-${Date.now()}`;
    const project = await Project.create({ name: projectName, userId: req.user.uid, uploadTime: Date.now() });
    const projectId = project._id.toString();
    const projectDir = path.join(UPLOADS_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    if (req.files.length === 1 && req.files[0].originalname.endsWith(".zip")) {
      const zip = new AdmZip(req.files[0].buffer);
      zip.extractAllTo(projectDir, true);
    } else {
      const paths = req.body.paths ? JSON.parse(req.body.paths) : [];
      req.files.forEach((file, index) => {
        const filePath = paths[index] || file.originalname;
        const fullPath = path.join(projectDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.buffer);
      });
    }

    const count = await processProject(projectDir, project);
    res.json({ message: "Project uploaded successfully", projectId, count });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to process upload" });
  }
};

const uploadProjectGithub = async (req, res) => {
  let tempZipPath = null;
  const projectNameReq = req.body.projectName;

  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "Repository URL is required" });

    const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) return res.status(400).json({ error: "Invalid GitHub URL" });

    const [_, user, repo] = repoMatch;
    const cleanRepoName = repo.replace(/.git$/, "");
    const zipUrl = `https://api.github.com/repos/${user}/${cleanRepoName}/zipball`;

    const projectName = projectNameReq || cleanRepoName;
    const project = await Project.create({ name: projectName, userId: req.user.uid, uploadTime: Date.now() });
    const projectId = project._id.toString();
    const projectDir = path.join(UPLOADS_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    tempZipPath = path.join(UPLOADS_DIR, `${projectId}.zip`);

    // Download ZIP using axios stream
    const response = await axios({
      method: "get",
      url: zipUrl,
      responseType: "stream",
      headers: { 'User-Agent': 'CodeInsight-Ingection-System' }
    });

    const writer = fs.createWriteStream(tempZipPath);
    await pipeline(response.data, writer);

    // Extract ZIP
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(projectDir, true);

    // Handle GitHub's zipball structure (it wraps items in a root folder)
    const dirs = fs.readdirSync(projectDir);
    if (dirs.length === 1 && fs.statSync(path.join(projectDir, dirs[0])).isDirectory()) {
      const rootDir = path.join(projectDir, dirs[0]);
      const items = fs.readdirSync(rootDir);
      for (const item of items) {
        fs.renameSync(path.join(rootDir, item), path.join(projectDir, item));
      }
      fs.rmdirSync(rootDir);
    }

    const count = await processProject(projectDir, project);

    // Cleanup ZIP
    if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);

    res.json({ message: "GitHub repository imported successfully", projectId, count });
  } catch (err) {
    console.error("GitHub import error:", err);
    if (tempZipPath && fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    res.status(500).json({ error: "Failed to import GitHub repository" });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.uid }).sort({ uploadTime: -1 }).lean();
    res.json(projects.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      fileCount: p.fileCount || 0,
      uploadTime: p.uploadTime || new Date(p.createdAt).getTime(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ _id: projectId, userId: req.user.uid });
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    await project.deleteOne();

    await File.deleteMany({ projectId });

    const projectDir = path.join(UPLOADS_DIR, projectId);
    if (fs.existsSync(projectDir)) fs.rmSync(projectDir, { recursive: true, force: true });

    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project" });
  }
};

const getStructure = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ _id: projectId, userId: req.user.uid }).lean();
    if (!project) return res.status(403).json({ error: "Forbidden" });
    const files = await File.find({ projectId }).lean();
    if (!files.length) return res.status(404).json({ error: "Project not found" });

    res.json(files.map((f) => ({ id: f._id, path: f.path, name: f.name })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch structure" });
  }
};

const getFileAnalysis = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId).lean();
    if (!file) return res.status(404).json({ error: "File not found" });
    const project = await Project.findOne({ _id: file.projectId, userId: req.user.uid }).lean();
    if (!project) return res.status(403).json({ error: "Forbidden" });

    let content = null;
    let diskMissing = false;
    if (fs.existsSync(file.savedPath)) {
      content = fs.readFileSync(file.savedPath, "utf8");
    } else {
      diskMissing = true;
      console.warn(`savedPath missing on disk for file ${file._id}: ${file.savedPath}`);
    }

    const explanation = `This is the file ${file.name}. It contains ${file.analysis.functions.length} function(s) and ${file.analysis.classes.length} class(es). It has ${file.analysis.imports.length} imports.`;

    res.json({ ...file, id: file._id, content, diskMissing, explanation });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch file" });
  }
};

export { uploadProject, uploadProjectGithub, getProjects, deleteProject, getStructure, getFileAnalysis };

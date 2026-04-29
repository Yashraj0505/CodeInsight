import {
  createProject,
  getUserProjects,
  deleteProject,
} from "./project.service.js";

export const create = async (req, res) => {
  try {
    const project = await createProject(req.user.uid, req.body.name);
    res.json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const projects = await getUserProjects(req.user.uid);
    res.json(projects);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    await deleteProject(req.params.id, req.user.uid);
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

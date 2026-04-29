import Project from "./project.model.js";

export const createProject = async (userId, name) => {
  return await Project.create({ name, userId });
};

export const getUserProjects = async (userId) => {
  return await Project.find({ userId });
};

export const deleteProject = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });

  if (!project) throw new Error("Project not found");

  await project.deleteOne();
};
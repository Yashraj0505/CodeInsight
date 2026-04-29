import mongoose from "mongoose";
import axios from "axios";
import Groq from "groq-sdk";
import File from "../models/File.js";
import Project from "../modules/project/project.model.js";
import asyncHandler from "../utils/asyncHandler.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const askQuestion = asyncHandler(async (req, res) => {
  const { question, contextFileId, projectId } = req.body;

  if (!question?.trim())
    return res.status(400).json({ error: "Question is required" });

  if (contextFileId && !isValidObjectId(contextFileId))
    return res.status(400).json({ error: "Invalid file ID" });

  if (projectId && !isValidObjectId(projectId))
    return res.status(400).json({ error: "Invalid project ID" });

  if (!process.env.GROQ_API_KEY) {
    return res.json({ answer: `GROQ_API_KEY is not set. Mock answer: You asked about "${question}"` });
  }

  let codeContext = "No code context provided.";

  if (contextFileId) {
    const file = await File.findById(contextFileId).lean();
    if (file) {
      const project = await Project.findById(file.projectId).lean();
      if (!project || project.userId !== req.user.uid)
        return res.status(403).json({ error: "Forbidden" });

      try {
        const { data: raw } = await axios.get(file.url, { responseType: "text", timeout: 10000 });
        const truncated = raw.length > 3000 ? raw.substring(0, 3000) + "\n... [truncated]" : raw;
        codeContext = `File: ${file.path}\n\nCode:\n${truncated}\n\nFunctions: ${file.analysis.functions.join(", ") || "none"}`;
      } catch {
        codeContext = `File: ${file.path}\n\nFunctions: ${file.analysis.functions.join(", ") || "none"}`;
      }
    }
  } else if (projectId) {
    const project = await Project.findById(projectId).lean();
    if (!project || project.userId !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });

    const files = await File.find({ projectId }).limit(20).lean();
    if (files.length > 0) {
      const summary = files
        .map((f) => `${f.path} (funcs: ${f.analysis.functions.slice(0, 5).join(", ") || "none"})`)
        .join("\n");
      codeContext = `Project file overview:\n${summary}`;
    }
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are an expert programming tutor and codebase analyzer. Your job is to explain code clearly to developers of all skill levels.\nRESPONSE RULES:\n- Always respond in structured Markdown format\n- Use \`\`\`language code blocks\`\`\` for any code examples\n- If code is provided, reference specific parts of it (like functions or classes) in your answer\n- Be practical and student-friendly`,
      },
      {
        role: "user",
        content: `Context:\n${codeContext}\n\nQuestion: ${question}`,
      },
    ],
    model: "llama-3.1-8b-instant",
    temperature: 0.5,
    max_tokens: 1500,
  });

  const answer = chatCompletion.choices?.[0]?.message?.content || "No response generated.";
  res.json({ answer });
});

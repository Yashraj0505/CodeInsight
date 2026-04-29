import fs from "fs";
import Groq from "groq-sdk";
import File from "../models/File.js";

const askQuestion = async (req, res) => {
  const { question, contextFileId, projectId } = req.body;

  console.log("Chat request:", { question, contextFileId, projectId });

  if (!question) {
    return res.status(400).json({ answer: "Please ask a question." });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.json({ answer: `GROQ_API_KEY is not set. Mock answer: You are asking about "${question}"` });
  }

  let codeContext = "No code context provided.";

  try {
    if (contextFileId) {
      const file = await File.findById(contextFileId).lean();
      if (file && fs.existsSync(file.savedPath)) {
        const fileContent = fs.readFileSync(file.savedPath, "utf8");
        const truncated = fileContent.length > 3000
          ? fileContent.substring(0, 3000) + "\n... [truncated]"
          : fileContent;
        codeContext = `File: ${file.path}\n\nCode:\n${truncated}\n\nFunctions: ${file.analysis.functions.join(", ") || "none"}`;
      }
    } else if (projectId) {
      const files = await File.find({ projectId }).limit(20).lean();
      if (files.length > 0) {
        const summary = files.map(f =>
          `${f.path} (funcs: ${f.analysis.functions.slice(0, 5).join(", ") || "none"})`
        ).join("\n");
        codeContext = `Project file overview:\n${summary}`;
      }
    }
  } catch (err) {
    console.warn("Context fetch error:", err.message);
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert programming tutor and codebase analyzer. Your job is to explain code clearly to developers of all skill levels.
RESPONSE RULES:
- Always respond in structured Markdown format
- Use \`\`\`language code blocks\`\`\` for any code examples
- If code is provided, reference specific parts of it (like functions or classes) in your answer
- Be practical and student-friendly`,
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

    console.log("AI response received:", chatCompletion.choices?.[0]?.message?.content?.substring(0, 100));

    const answer = chatCompletion.choices?.[0]?.message?.content || "No response generated.";
    res.json({ answer });
  } catch (error) {
    console.error("Groq AI Error:", error.message);
    res.status(500).json({ answer: `AI error: ${error.message}` });
  }
};

export { askQuestion };

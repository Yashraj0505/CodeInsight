const fs = require('fs');
const { Groq } = require('groq-sdk');
const { projects } = require('./projectController');

// Groq fallback dummy if key is not defined in env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });

const askQuestion = async (req, res) => {
    const { question, contextFileId, projectId } = req.body;
    
    if (!question) {
        return res.json({ answer: "Please ask a question." });
    }
    
    if (!process.env.GROQ_API_KEY) {
        // Fallback for students who haven't set the key
        return res.json({ answer: "GROQ_API_KEY is not set on the server! But here is a mock answer: You are asking about " + question });
    }

    let codeContext = "No code context provided.";
    if (projectId && projects[projectId]) {
        if (contextFileId !== undefined && contextFileId !== null) {
            const file = projects[projectId].files.find(f => f.id === parseInt(contextFileId));
            if (file) {
                let fileContent = "";
                if (fs.existsSync(file.savedPath)) {
                    fileContent = fs.readFileSync(file.savedPath, 'utf8');
                }
                const truncated = fileContent.length > 3000
                    ? fileContent.substring(0, 3000) + '\n... [truncated for brevity]'
                    : fileContent;
                codeContext = `File: ${file.path}\n\nCode:\n${truncated}\n\nExtracted Functions: ${file.analysis.functions.join(', ')}`;
            }
        } else {
             const summary = projects[projectId].files.slice(0, 20).map(f =>
                 `${f.path} (funcs: ${f.analysis.functions.slice(0,5).join(', ') || 'none'})`
             ).join('\n');
             codeContext = `Project file overview:\n${summary}`;
        }
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert programming tutor and codebase analyzer. Your job is to explain code clearly to developers of all skill levels.
RESPONSE RULES:
- Always respond in structured Markdown format
- Use \`\`\`language code blocks\`\`\` for any code examples
- If code is provided, reference specific parts of it (like functions or classes) in your answer
- Be practical and student-friendly`
                },
                {
                    role: "user",
                    content: `Context:\n${codeContext}\n\nQuestion: ${question}`
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.5,
            max_tokens: 1500
        });

        res.json({ answer: chatCompletion.choices[0]?.message?.content || "No response generated." });
    } catch (error) {
        console.error("Groq AI Error:", error);
        res.status(500).json({ answer: "Sorry, I encountered an error connecting to my AI brain. Check server logs." });
    }
};

module.exports = { askQuestion };

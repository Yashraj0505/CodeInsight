require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Groq } = require('groq-sdk');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const app = express();

// Safeguard against missing GROQ_API_KEY
if (!process.env.GROQ_API_KEY) {
    console.warn("WARNING: GROQ_API_KEY is not set. You'll need to configure this to use the AI Chat feature.");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });
const port = 5000;

app.use(cors());
app.use(express.json());

// Set up memory storage for multer (good for small projects in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// In-memory Database for projects
const projects = {};

// Helper to do simple analysis (like a student parsing for functions/classes/imports)
const analyzeFile = (content, filename) => {
    let functions = [];
    let classes = [];
    let imports = [];

    const lines = content.split('\n');

    // JS/TS
    if (filename.match(/\.(js|jsx|ts|tsx)$/)) {
        lines.forEach(line => {
            if (line.includes('function ')) {
                let match = line.match(/function\s+([a-zA-Z0-9_]+)/);
                if (match) functions.push(match[1]);
            }
            if (line.includes('const ') && line.includes('=>')) {
                let match = line.match(/const\s+([a-zA-Z0-9_]+)\s*=/);
                if (match) functions.push(match[1]);
            }
            if (line.includes('class ')) {
                let match = line.match(/class\s+([a-zA-Z0-9_]+)/);
                if (match) classes.push(match[1]);
            }
            if (line.includes('import ')) {
                let match = line.match(/import\s+.*from\s+['"](.*)['"]/);
                if (match) imports.push(match[1]);
            }
            if (line.includes('require(')) {
                let match = line.match(/require\(['"](.*)['"]\)/);
                if (match) imports.push(match[1]);
            }
        });
    }
    // Python
    else if (filename.match(/\.py$/)) {
        lines.forEach(line => {
            let defMatch = line.match(/^\s*def\s+([a-zA-Z0-9_]+)\s*\(/);
            if (defMatch) functions.push(defMatch[1]);
            
            let classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)/);
            if (classMatch) classes.push(classMatch[1]);
            
            let importMatch = line.match(/^\s*import\s+([a-zA-Z0-9_\.]+)/);
            if (importMatch) imports.push(importMatch[1]);
            
            let fromImportMatch = line.match(/^\s*from\s+([a-zA-Z0-9_\.]+)\s+import/);
            if (fromImportMatch) imports.push(fromImportMatch[1]);
        });
    }
    // C/C++
    else if (filename.match(/\.(c|cpp|h|hpp)$/)) {
        lines.forEach(line => {
            let includeMatch = line.match(/^\s*#include\s*[<"]([^>"]+)[>"]/);
            if (includeMatch) imports.push(includeMatch[1]);
            
            let classMatch = line.match(/^\s*(class|struct)\s+([a-zA-Z0-9_]+)/);
            if (classMatch) classes.push(classMatch[2]);
            
            let funcMatch = line.match(/^\s*(?:[\w:]+(?:\s*[\*&]+)?\s+)+([a-zA-Z_]\w*)\s*\(/);
            if (funcMatch && !funcMatch[0].includes('return')) {
                const keywords = ['if', 'while', 'for', 'switch', 'catch', 'sizeof'];
                if (!keywords.includes(funcMatch[1])) {
                    functions.push(funcMatch[1]);
                }
            }
        });
    }

    return { functions, classes, imports };
};

// 1. Upload route (Handles Directory OR Zip)
app.post('/api/project/upload', upload.array('files'), (req, res) => {
    try {
        const projectId = crypto.randomUUID();
        const projectName = req.body.projectName || `Project-${projectId.substring(0, 5)}`;
        let paths = req.body.paths ? JSON.parse(req.body.paths) : [];
        
        let projectFiles = [];

        // Check if we received a single zip file
        if (req.files.length === 1 && req.files[0].originalname.endsWith('.zip')) {
            const zip = new AdmZip(req.files[0].buffer);
            const zipEntries = zip.getEntries();
            
            let fileIdCounter = 0;
            zipEntries.forEach(zipEntry => {
                // skip directories and __MACOSX meta folders
                if (!zipEntry.isDirectory && !zipEntry.entryName.startsWith('__MACOSX') && !zipEntry.entryName.includes('/.')) {
                    const content = zipEntry.getData().toString('utf8');
                    const filename = zipEntry.name;
                    const filePath = zipEntry.entryName;
                    
                    // Skip large binary files based on extensions
                    if (filename.match(/\.(png|jpg|jpeg|gif|ico|pdf|exe|dll|so|dylib)$/)) return;

                    const analysis = analyzeFile(content, filename);
                    
                    projectFiles.push({
                        id: fileIdCounter++,
                        path: filePath,
                        name: filename,
                        content: content,
                        analysis: analysis
                    });
                }
            });
        } else {
            // Normal directory upload
            req.files.forEach((file, index) => {
                let content = file.buffer.toString('utf8');
                let filename = file.originalname;
                let filePath = paths[index] || filename;
                let analysis = analyzeFile(content, filename);

                projectFiles.push({
                    id: index,
                    path: filePath,
                    name: filename,
                    content: content,
                    analysis: analysis
                });
            });
        }

        projects[projectId] = {
            id: projectId,
            name: projectName,
            uploadTime: Date.now(),
            files: projectFiles
        };

        res.json({ message: 'Project uploaded successfully', projectId, count: projectFiles.length });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Failed to process upload" });
    }
});

// 2. Get all projects summary
app.get('/api/projects', (req, res) => {
    const list = Object.values(projects).map(p => ({
        id: p.id,
        name: p.name,
        fileCount: p.files.length,
        uploadTime: p.uploadTime
    })).sort((a, b) => b.uploadTime - a.uploadTime); // newest first
    res.json(list);
});

// 3. Delete a project
app.delete('/api/project/:projectId', (req, res) => {
    const { projectId } = req.params;
    if (projects[projectId]) {
        delete projects[projectId]; // Frees memory
        res.json({ success: true, message: "Project deleted from memory" });
    } else {
        res.status(404).json({ success: false, error: "Project not found" });
    }
});

// 4. Get file structure structure
app.get('/api/project/:projectId/structure', (req, res) => {
    const { projectId } = req.params;
    if (!projects[projectId]) return res.status(404).json({ error: 'Project not found' });
    
    // Return flat list - client handles rendering
    const fileList = projects[projectId].files.map(f => ({
        id: f.id,
        path: f.path,
        name: f.name
    }));
    res.json(fileList);
});

// 5. Get single file content
app.get('/api/project/:projectId/file/:fileId', (req, res) => {
    const { projectId, fileId } = req.params;
    if (!projects[projectId]) return res.status(404).json({ error: 'Project not found' });

    const fileList = projects[projectId].files;
    const file = fileList.find(f => f.id === parseInt(fileId));
    
    if (file) {
        let explanation = `This is the file ${file.name}. It contains ${file.analysis.functions.length} function(s) and ${file.analysis.classes.length} class(es). ` +
                          `It has ${file.analysis.imports.length} imports.`;
        res.json({ ...file, explanation });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// 6. Project Search Endpoint
app.get('/api/project/:projectId/search', (req, res) => {
    const { projectId } = req.params;
    const { q } = req.query;
    if (!projects[projectId]) return res.status(404).json({ error: 'Project not found' });

    if (!q) return res.json([]);

    const results = [];
    const lowerQuery = q.toLowerCase();

    projects[projectId].files.forEach(f => {
        if (f.content.toLowerCase().includes(lowerQuery) || f.name.toLowerCase().includes(lowerQuery)) {
            const lines = f.content.split('\n');
            const matchedLines = [];
            lines.forEach((line, index) => {
                if (line.toLowerCase().includes(lowerQuery)) {
                    matchedLines.push({ lineNumber: index + 1, content: line.trim() });
                }
            });
            
            if (matchedLines.length > 0 || f.name.toLowerCase().includes(lowerQuery)) {
                 results.push({
                     fileId: f.id,
                     path: f.path,
                     name: f.name,
                     matches: matchedLines
                 });
            }
        }
    });

    res.json(results);
});

// 7. Chat endpoint (Real AI via Groq)
app.post('/api/chat', async (req, res) => {
    const { question, contextFileId, projectId } = req.body;
    
    if (!question) {
        return res.json({ answer: "Please ask a question." });
    }
    
    if (process.env.GROQ_API_KEY === undefined || process.env.GROQ_API_KEY === '') {
        return res.status(500).json({ answer: "Groq API is not configured on the server." });
    }

    let codeContext = "No code context provided.";
    if (projectId && projects[projectId]) {
        if (contextFileId !== undefined && contextFileId !== null) {
            const file = projects[projectId].files.find(f => f.id === parseInt(contextFileId));
            if (file) {
                // Truncate to 3000 chars to stay within free-tier token limits
                const truncated = file.content.length > 3000
                    ? file.content.substring(0, 3000) + '\n... [truncated for brevity]'
                    : file.content;
                codeContext = `File: ${file.path}\n\nCode:\n${truncated}`;
            }
        } else {
             // global context: send file paths + brief analysis summary only
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
- Always respond in structured Markdown format (use headings, bullet points, bold, code blocks)
- Use ## for main sections, ### for sub-sections
- Use \`\`\`language code blocks\`\`\` for any code examples
- Use **bold** for key terms and important concepts
- Use bullet points or numbered lists to break down complex ideas
- End with a short "💡 Key Takeaway" summary

ANSWER STYLE:
- Be clear, practical, and beginner-friendly
- Explain the "what", "why", and "how"
- If code is provided, reference specific parts of it in your answer
- Do NOT hallucinate capabilities — be honest about what you can see`
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
});

// Auto-delete projects older than 2 hours to avoid memory bloat
setInterval(() => {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    Object.keys(projects).forEach(projectId => {
        if (now - projects[projectId].uploadTime > TWO_HOURS) {
            console.log(`Auto-deleting project ${projectId} due to expiry`);
            delete projects[projectId];
        }
    });
}, 30 * 60 * 1000); // Check every 30 mins

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

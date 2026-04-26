const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { analyzeFile } = require('../services/codeAnalyzer');

const projects = {};
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uploadProject = (req, res) => {
    try {
        const projectId = crypto.randomUUID();
        const projectName = req.body.projectName || `Project-${projectId.substring(0, 5)}`;
        let paths = req.body.paths ? JSON.parse(req.body.paths) : [];
        
        let projectFiles = [];

        const projectDir = path.join(UPLOADS_DIR, projectId);
        fs.mkdirSync(projectDir, { recursive: true });

        if (req.files.length === 1 && req.files[0].originalname.endsWith('.zip')) {
            const zip = new AdmZip(req.files[0].buffer);
            const zipEntries = zip.getEntries();
            
            let fileIdCounter = 0;
            zipEntries.forEach(zipEntry => {
                if (!zipEntry.isDirectory && !zipEntry.entryName.startsWith('__MACOSX') && !zipEntry.entryName.includes('/.')) {
                    const content = zipEntry.getData().toString('utf8');
                    const filename = zipEntry.name;
                    const filePath = zipEntry.entryName;
                    
                    if (filename.match(/\.(png|jpg|jpeg|gif|ico|pdf|exe|dll|so|dylib)$/)) return;

                    const fullPath = path.join(projectDir, filePath);
                    const dirName = path.dirname(fullPath);
                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName, { recursive: true });
                    }
                    fs.writeFileSync(fullPath, content);

                    const analysis = analyzeFile(content, filename);
                    
                    projectFiles.push({
                        id: fileIdCounter++,
                        path: filePath,
                        name: filename,
                        savedPath: fullPath,
                        analysis: analysis
                    });
                }
            });
        } else {
            req.files.forEach((file, index) => {
                let content = file.buffer.toString('utf8');
                let filename = file.originalname;
                let filePath = paths[index] || filename;
                
                const fullPath = path.join(projectDir, filePath);
                const dirName = path.dirname(fullPath);
                if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName, { recursive: true });
                }
                fs.writeFileSync(fullPath, content);
                
                let analysis = analyzeFile(content, filename);

                projectFiles.push({
                    id: index,
                    path: filePath,
                    name: filename,
                    savedPath: fullPath,
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
};

const getProjects = (req, res) => {
    const list = Object.values(projects).map(p => ({
        id: p.id,
        name: p.name,
        fileCount: p.files.length,
        uploadTime: p.uploadTime
    })).sort((a, b) => b.uploadTime - a.uploadTime);
    res.json(list);
};

const deleteProject = (req, res) => {
    const { projectId } = req.params;
    if (projects[projectId]) {
        delete projects[projectId]; // Clear memory
        
        // Remove from disk
        const projectDir = path.join(UPLOADS_DIR, projectId);
        if (fs.existsSync(projectDir)) {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
        res.json({ success: true, message: "Project deleted from memory and disk" });
    } else {
        res.status(404).json({ success: false, error: "Project not found" });
    }
};

const getStructure = (req, res) => {
    const { projectId } = req.params;
    if (!projects[projectId]) return res.status(404).json({ error: 'Project not found' });
    
    const fileList = projects[projectId].files.map(f => ({
        id: f.id,
        path: f.path,
        name: f.name
    }));
    res.json(fileList);
};

const getFileAnalysis = (req, res) => {
    const { projectId, fileId } = req.params;
    if (!projects[projectId]) return res.status(404).json({ error: 'Project not found' });

    const fileList = projects[projectId].files;
    const file = fileList.find(f => f.id === parseInt(fileId));
    
    if (file) {
        let explanation = `This is the file ${file.name}. It contains ${file.analysis.functions.length} function(s) and ${file.analysis.classes.length} class(es). ` +
                          `It has ${file.analysis.imports.length} imports.`;
        
        // Read content directly from disk
        let content = "File content unavailable.";
        if (fs.existsSync(file.savedPath)) {
            content = fs.readFileSync(file.savedPath, 'utf8');
        }

        res.json({ ...file, content, explanation });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
};

module.exports = {
    projects,
    uploadProject,
    getProjects,
    deleteProject,
    getStructure,
    getFileAnalysis
};

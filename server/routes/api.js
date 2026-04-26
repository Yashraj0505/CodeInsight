const express = require('express');
const multer = require('multer');

const {
    uploadProject,
    getProjects,
    deleteProject,
    getStructure,
    getFileAnalysis
} = require('../controllers/projectController');
const { askQuestion } = require('../controllers/chatController');

const router = express.Router();

// Setup Multer to use memory storage temporarily before writing to disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Match what the frontend expects exactly
router.post('/project/upload', upload.array('files'), uploadProject);
router.get('/projects', getProjects); // All projects summary
router.delete('/project/:projectId', deleteProject);
router.get('/project/:projectId/structure', getStructure);
router.get('/project/:projectId/file/:fileId', getFileAnalysis);

// Specific analysis overview
router.get('/analysis', (req, res) => {
    res.json({ message: "Use /project/:projectId/file/:fileId for file details" });
});

router.post('/chat', askQuestion);

module.exports = router;

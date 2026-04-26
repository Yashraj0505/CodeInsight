import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CodeViewer from './components/CodeViewer';
import QuestionPanel from './components/QuestionPanel';
import Dashboard from './components/Dashboard';

function App() {
  const [projectId, setProjectId] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeFileDetails, setActiveFileDetails] = useState(null);

  // Fetch file list from backend for the active project
  const fetchStructure = useCallback(async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/project/${id}/structure`);
      if (!response.ok) throw new Error("Not found");
      const data = await response.json();
      setFiles(data);
      
      // Reset active file if the structure changed
      setActiveFileId(null);
      setActiveFileDetails(null);
    } catch (error) {
      console.error("Error fetching structure:", error);
      // Project might have been deleted, go back to dashboard
      setProjectId(null);
    }
  }, []);

  // Fetch full details of a specific file
  const fetchFileDetails = async (fileId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/project/${projectId}/file/${fileId}`);
      const data = await response.json();
      setActiveFileDetails(data);
    } catch (error) {
      console.error("Error fetching file details:", error);
    }
  };

  useEffect(() => {
    if (projectId) {
        fetchStructure(projectId);
    }
  }, [projectId, fetchStructure]);

  // When user clicks a file in the sidebar
  const handleFileSelect = (id) => {
    setActiveFileId(id);
    fetchFileDetails(id);
  };

  // Note: we removed file-level delete to focus on project-level delete in dashboard
  const handleDelete = async (id) => {}; 

  if (!projectId) {
      return (
          <div className="app-container">
             <Dashboard onSelectProject={setProjectId} />
          </div>
      );
  }

  return (
    <div className="app-container">
      {/* Left panel */}
      <Sidebar 
        files={files} 
        activeFileId={activeFileId} 
        onFileSelect={handleFileSelect} 
        onDelete={handleDelete}
        onBack={() => setProjectId(null)}
      />
      
      {/* Right panel */}
      <div className="main-content">
        <CodeViewer file={activeFileDetails} />
        <QuestionPanel activeFileId={activeFileId} projectId={projectId} />
      </div>
    </div>
  );
}

export default App;

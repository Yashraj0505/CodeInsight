import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { apiFetch } from './utils/api';

import Sidebar from './components/Sidebar';
import CodeViewer from './components/CodeViewer';
import QuestionPanel from './components/QuestionPanel';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

// Redirects to /auth if no token is present
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" replace />;
};

// Drag-to-resize divider
function Divider({ onMouseDown }) {
  return (
    <div className="resize-divider" onMouseDown={onMouseDown} />
  );
}

function Workspace() {
  const [projectId, setProjectId] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeFileDetails, setActiveFileDetails] = useState(null);

  // Panel widths in px; centre panel is flex:1 (fills remaining space)
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(360);

  const containerRef = React.useRef(null);
  const dragging = React.useRef(null); // 'sidebar' | 'chat'

  const startDrag = (panel) => (e) => {
    e.preventDefault();
    dragging.current = { panel, startX: e.clientX, startSidebar: sidebarWidth, startChat: chatWidth };
  };

  React.useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const { panel, startX, startSidebar, startChat } = dragging.current;
      const dx = e.clientX - startX;
      const total = containerRef.current?.offsetWidth || window.innerWidth;
      if (panel === 'sidebar') {
        setSidebarWidth(Math.min(Math.max(180, startSidebar + dx), total - chatWidth - 300));
      } else {
        setChatWidth(Math.min(Math.max(240, startChat - dx), total - sidebarWidth - 300));
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [sidebarWidth, chatWidth]);

  const fetchStructure = useCallback(async (id) => {
    try {
      const res = await apiFetch(`/api/project/${id}/structure`);
      if (!res.ok) throw new Error();
      setFiles(await res.json());
      setActiveFileId(null);
      setActiveFileDetails(null);
    } catch {
      setProjectId(null);
    }
  }, []);

  const fetchFileDetails = async (fileId) => {
    try {
      const res = await apiFetch(`/api/project/${projectId}/file/${fileId}`);
      setActiveFileDetails(await res.json());
    } catch (err) {
      console.error('Error fetching file details:', err);
    }
  };

  useEffect(() => {
    if (projectId) fetchStructure(projectId);
  }, [projectId, fetchStructure]);

  const handleFileSelect = (id) => {
    setActiveFileId(id);
    fetchFileDetails(id);
  };

  if (!projectId) {
    return <Dashboard onSelectProject={setProjectId} />;
  }

  return (
    <div className="app-container" ref={containerRef}>
      {/* Left — file tree */}
      <div className="panel-sidebar" style={{ width: sidebarWidth }}>
        <Sidebar
          files={files}
          activeFileId={activeFileId}
          onFileSelect={handleFileSelect}
          onDelete={() => {}}
          onBack={() => setProjectId(null)}
        />
      </div>

      <Divider onMouseDown={startDrag('sidebar')} />

      {/* Centre — code + analysis */}
      <div className="panel-centre">
        <CodeViewer file={activeFileDetails} />
      </div>

      <Divider onMouseDown={startDrag('chat')} />

      {/* Right — chat */}
      <div className="panel-chat" style={{ width: chatWidth }}>
        <QuestionPanel activeFileId={activeFileId} projectId={projectId} />
      </div>
    </div>
  );
}

function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken(true); // force refresh
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  if (!authReady) return null;

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

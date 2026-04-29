import React, { useState, useEffect } from 'react';
import { Trash2, FolderOpen, Code, Clock, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import FileUpload from '../components/FileUpload';
import { apiFetch } from '../utils/api';

const Dashboard = ({ onSelectProject }) => {
  const [projects, setProjects] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const response = await apiFetch('/api/projects');
      if (!response.ok) throw new Error();
      const data = await response.json();
      setProjects(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/project/${id}`, { method: 'DELETE' });
      if (res.ok) setProjects(projects.filter(p => p.id.toString() !== id.toString()));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const handleUploadSuccess = (projectId) => {
    fetchProjects();
    if (projectId) onSelectProject(projectId);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Project Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your uploaded codebases and workspaces.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--text-muted)', borderRadius: '8px',
              padding: '9px 14px', cursor: 'pointer', fontSize: '0.88rem',
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="empty-state" style={{ marginTop: '80px' }}>
          <FolderOpen size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
          <h2>Could not load projects</h2>
          <p>Make sure the server is running on port 5000 and MongoDB is connected.</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '80px' }}>
          <FolderOpen size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
          <h2>No Projects Uploaded</h2>
          <p>Upload a .zip file or a directory to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {projects.map(p => (
            <div key={p.id} className="project-card" style={{
              background: 'var(--bg-panel)', borderRadius: 'var(--border-radius)',
              padding: '24px', border: '1px solid var(--border-light)',
              display: 'flex', flexDirection: 'column', gap: '16px',
              boxShadow: 'var(--shadow-md)', transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={18} color="var(--accent-primary)" /> {p.name}
                </h3>
                <button onClick={() => handleDelete(p.id)} style={{
                  background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px',
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Files:</strong> {p.fileCount}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> {new Date(p.uploadTime).toLocaleString()}
                </div>
              </div>
              <button onClick={() => onSelectProject(p.id)} style={{
                marginTop: 'auto', padding: '10px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: 'var(--text-active)', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '600',
              }}>
                Open Workspace
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

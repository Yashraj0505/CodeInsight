import React, { useState, useEffect } from 'react';
import { Trash2, FolderOpen, Code, Clock } from 'lucide-react';
import FileUpload from './FileUpload';

const Dashboard = ({ onSelectProject }) => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/projects');
        const data = await response.json();
        setProjects(data);
    } catch (err) {
        console.error("Failed to fetch projects", err);
    }
  };

  const handleDelete = async (id) => {
      try {
          const res = await fetch(`http://localhost:5000/api/project/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setProjects(projects.filter(p => p.id !== id));
          }
      } catch (err) {
          console.error("Failed to delete project", err);
      }
  };

  const handleUploadSuccess = (projectId) => {
      fetchProjects();
      if(projectId) {
          onSelectProject(projectId);
      }
  };

  return (
    <div className="dashboard-container" style={{ padding: '40px', flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Project Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your uploaded codebases and workspaces.</p>
        </div>
        <FileUpload onUploadSuccess={handleUploadSuccess} />
      </div>

      {projects.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '80px' }}>
            <FolderOpen size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
            <h2>No Projects Uploaded</h2>
            <p>Upload a .zip file or a directory to get started.</p>
        </div>
      ) : (
        <div className="projects-grid" style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '24px'
        }}>
            {projects.map(p => (
                <div key={p.id} className="project-card" style={{
                    background: 'var(--bg-panel)',
                    borderRadius: 'var(--border-radius)',
                    padding: '24px',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: 'var(--shadow-md)',
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Code size={20} color="var(--accent-primary)" />
                            {p.name}
                        </h3>
                        <button onClick={() => handleDelete(p.id)} style={{
                            background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px'
                        }}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                    
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div><strong>Files:</strong> {p.fileCount}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} /> 
                            {new Date(p.uploadTime).toLocaleString()}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => onSelectProject(p.id)}
                        style={{
                            marginTop: 'auto',
                            padding: '10px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            color: 'var(--text-active)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
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

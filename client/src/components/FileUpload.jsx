import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, GitBranch } from 'lucide-react';
import { apiFetch } from '../utils/api';

const FileUpload = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [activeTab, setActiveTab] = useState('zip'); // 'zip' | 'folder' | 'github'
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    const paths = [];
    let projectName = '';

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      const path = files[i].webkitRelativePath || files[i].name;
      paths.push(path);

      if (i === 0) {
        if (files[i].webkitRelativePath) {
          projectName = files[i].webkitRelativePath.split('/')[0];
        } else {
          projectName = files[i].name.replace('.zip', '').replace('.ZIP', '');
        }
      }
    }

    formData.append('paths', JSON.stringify(paths));
    formData.append('projectName', projectName);

    try {
      const response = await apiFetch('/api/project/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setIsUploading(false);
      onUploadSuccess(data.projectId);

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Error uploading files:", err);
      setIsUploading(false);
      alert("Failed to upload files. Make sure server is running on port 5000.");
    }
  };

  const handleGithubUpload = async () => {
    if (!githubUrl.trim()) return;
    if (!githubUrl.includes('github.com')) {
      alert('Please enter a valid GitHub repository URL.');
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiFetch('/api/project/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: githubUrl.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed');

      setIsUploading(false);
      setGithubUrl('');
      onUploadSuccess(data.projectId);
    } catch (err) {
      console.error("Error importing GitHub repo:", err);
      setIsUploading(false);
      alert(err.message || "Failed to import GitHub repository.");
    }
  };

  const triggerFileInput = () => {
    document.getElementById('directory-upload').click();
  };

  const triggerZipUpload = () => {
    document.getElementById('zip-upload').click();
  };

  return (
    <div className="upload-section" style={{ gap: '10px' }}>
      {isUploading && (
        <div className="upload-status">
          <Loader2 size={16} className="lucide-spin" /> Processing project...
        </div>
      )}

      {/* Tab Switcher */}
      <div className="upload-tabs" style={{
        display: 'flex', gap: '4px', marginBottom: '8px',
        background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px'
      }}>
        {['zip', 'folder', 'github'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: activeTab === tab ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
            }}
          >
            {tab === 'zip' ? '📦 ZIP' : tab === 'folder' ? '📁 Folder' : '🔗 GitHub'}
          </button>
        ))}
      </div>

      {/* Hidden file inputs */}
      <input
        id="directory-upload"
        type="file"
        multiple
        webkitdirectory="true"
        directory="true"
        ref={fileInputRef}
        onChange={(e) => { if (e.target.files.length) handleUpload(e) }}
        style={{ display: 'none' }}
      />
      <input
        id="zip-upload"
        type="file"
        accept=".zip"
        onChange={(e) => {
          if (e.target.files.length) {
            fileInputRef.current = e.target;
            handleUpload(e);
          }
        }}
        style={{ display: 'none' }}
      />

      {/* Conditional rendering based on active tab */}
      {activeTab === 'zip' && (
        <button
          className={`upload-label ${isUploading ? 'disabled' : ''}`}
          onClick={triggerZipUpload}
          disabled={isUploading}
        >
          <UploadCloud size={18} />
          {isUploading ? 'Uploading...' : 'Upload .ZIP File'}
        </button>
      )}

      {activeTab === 'folder' && (
        <button
          className={`upload-label ${isUploading ? 'disabled' : ''}`}
          onClick={triggerFileInput}
          disabled={isUploading}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <UploadCloud size={18} />
          {isUploading ? 'Uploading...' : 'Select Folder'}
        </button>
      )}

      {activeTab === 'github' && (
        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGithubUpload(); }}
            disabled={isUploading}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
              fontSize: '13px', outline: 'none',
            }}
          />
          <button
            className={`upload-label ${isUploading ? 'disabled' : ''}`}
            onClick={handleGithubUpload}
            disabled={isUploading || !githubUrl.trim()}
            style={{
              padding: '8px 14px', whiteSpace: 'nowrap',
              opacity: (!githubUrl.trim() || isUploading) ? 0.5 : 1
            }}
          >
            <GitBranch size={16} />
            {isUploading ? 'Importing...' : 'Import'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

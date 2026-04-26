import React, { useState, useMemo } from 'react';
import { FileCode, FolderOpen, FolderClosed, Trash2 } from 'lucide-react';

const TreeNode = ({ node, activeFileId, onFileSelect, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === 'file') {
    const isActive = activeFileId === node.id;
    return (
      <li className={`file-item ${isActive ? 'active' : ''}`} style={{ marginLeft: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }} onClick={() => onFileSelect(node.id)}>
            <FileCode size={16} strokeWidth={1.5} color={isActive ? "#8b5cf6" : "#94a3b8"} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
            </span>
        </div>
      </li>
    );
  }

  // It's a folder
  return (
    <li className="folder-item" style={{ marginLeft: '12px', marginTop: '4px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0', color: '#cbd5e1' }}
      >
        {isOpen ? <FolderOpen size={16} color="#3b82f6" /> : <FolderClosed size={16} color="#3b82f6" />}
        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{node.name}</span>
      </div>
      {isOpen && (
        <ul style={{ listStyle: 'none' }}>
          {Object.values(node.children).map(childNode => (
            <TreeNode 
                key={childNode.path || childNode.name} 
                node={childNode} 
                activeFileId={activeFileId} 
                onFileSelect={onFileSelect} 
                onDelete={onDelete} 
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const Sidebar = ({ files, activeFileId, onFileSelect, onBack }) => {
  const fileTree = useMemo(() => {
    const root = { name: "Project", children: {}, type: "folder", path: "root" };
    files.forEach(file => {
        // Handle paths that use backslashes or forward slashes
        const normalizedPath = file.path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(p => p);
        let current = root;
        
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                // Leaf node (file)
                current.children[part] = { ...file, type: 'file' };
            } else {
                // Directory node
                if (!current.children[part]) {
                    current.children[part] = { name: part, children: {}, type: 'folder', path: parts.slice(0, index+1).join('/') };
                }
                current = current.children[part];
            }
        });
    });
    return root;
  }, [files]);

  return (
    <div className="sidebar" style={{ width: '320px' }}>
      <button 
          onClick={onBack}
          style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '20px', fontSize: '0.9rem'
          }}
      >
          ← Back to Dashboard
      </button>

      <h2><FolderOpen size={20} color="#8b5cf6" /> Workspace Explorer</h2>
      
      {files.length === 0 ? (
        <div className="empty-state">
          No files loaded. Click "Upload" to add a directory.
        </div>
      ) : (
        <ul className="file-list" style={{ marginLeft: '-12px', marginTop: '10px' }}>
            {Object.values(fileTree.children).map(node => (
                <TreeNode 
                    key={node.path || node.name} 
                    node={node} 
                    activeFileId={activeFileId} 
                    onFileSelect={onFileSelect}
                    onDelete={() => {}} // Disabled file-level deletion
                />
            ))}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;

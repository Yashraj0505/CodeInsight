import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

const FileUpload = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    const formData = new FormData();
    const paths = [];

    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
        const path = files[i].webkitRelativePath || files[i].name;
        paths.push(path);
    }
    
    formData.append('paths', JSON.stringify(paths));

    try {
        const response = await fetch('http://localhost:5000/api/project/upload', {
            method: 'POST',
            body: formData,
        });
        
        const data = await response.json();
        setIsUploading(false);
        onUploadSuccess(data.projectId); // notify parent with new project it
        
        if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
        console.error("Error uploading files:", err);
        setIsUploading(false);
        alert("Failed to upload files. Make sure server is running on port 5000.");
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
      <input 
        id="directory-upload"
        type="file" 
        multiple 
        webkitdirectory="true" 
        directory="true"
        ref={fileInputRef}
        onChange={(e) => { if(e.target.files.length) handleUpload(e) }}
      />
      <input 
        id="zip-upload"
        type="file" 
        accept=".zip"
        onChange={(e) => { 
            // We temporarily use same handleUpload but bypass ref logic
            if(e.target.files.length) {
                fileInputRef.current = e.target;
                handleUpload(e);
            }
        }}
        style={{ display: 'none' }}
      />
      <button 
        className={`upload-label ${isUploading ? 'disabled' : ''}`}
        onClick={triggerZipUpload}
        disabled={isUploading}
      >
        <UploadCloud size={18} />
        {isUploading ? 'Uploading...' : 'Upload .ZIP'}
      </button>
      <button 
        className={`upload-label ${isUploading ? 'disabled' : ''}`}
        onClick={triggerFileInput}
        disabled={isUploading}
        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        <UploadCloud size={18} />
        {isUploading ? 'Uploading...' : 'Upload Folder'}
      </button>
    </div>
  );
};

export default FileUpload;

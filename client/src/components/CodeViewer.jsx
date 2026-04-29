import React from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import { Code, Package, Box, FunctionSquare, LayoutDashboard } from 'lucide-react';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('cpp', cpp);

const CodeViewer = ({ file }) => {
  if (!file) {
    return (
      <div className="no-file-selected" style={{ flex: 1 }}>
        <LayoutDashboard size={48} color="#475569" strokeWidth={1.5} />
        <p>Select a file from the sidebar to view code and AI insights</p>
      </div>
    );
  }

  const funcs = file.analysis?.functions || [];
  const classes = file.analysis?.classes || [];
  const imports = file.analysis?.imports || [];

  const getLanguage = (filename) => {
    if (filename.match(/\.py$/)) return 'python';
    if (filename.match(/\.(c|cpp|h|hpp)$/)) return 'cpp';
    return 'javascript';
  };
  const syntaxLanguage = getLanguage(file.name);

  return (
    <div className="content-area">
      {/* Code Viewer Section */}
      <div className="code-viewer">
        <div className="code-header">
          <Code size={18} color="#94a3b8" />
          {file.name} 
        </div>
        <SyntaxHighlighter
          language={syntaxLanguage}
          style={atomOneDark}
          className="syntax-container"
          showLineNumbers={true}
          wrapLines={true}
        >
          {file.diskMissing
            ? "// ⚠️ File no longer exists on disk. The project may need to be re-uploaded."
            : file.content ?? "// Empty file"}
        </SyntaxHighlighter>
      </div>

      {/* Analysis Section */}
      <div className="analysis-info">
        <div className="analysis-card">
          <h4><FunctionSquare size={16} /> Functions</h4>
          {funcs.length > 0 ? (
            <div className="analysis-tags">
              {funcs.map((f, i) => <span key={i} className="tag">{f}()</span>)}
            </div>
          ) : (
            <div className="empty-tag">No functions detected.</div>
          )}
        </div>

        <div className="analysis-card">
          <h4><Box size={16} /> Classes</h4>
          {classes.length > 0 ? (
            <div className="analysis-tags">
              {classes.map((c, i) => <span key={i} className="tag class-tag">{c}</span>)}
            </div>
          ) : (
            <div className="empty-tag">No classes detected.</div>
          )}
        </div>

        <div className="analysis-card">
          <h4><Package size={16} /> Dependencies</h4>
          {imports.length > 0 ? (
            <div className="analysis-tags">
              {imports.map((imp, i) => <span key={i} className="tag import-tag">{imp}</span>)}
            </div>
          ) : (
            <div className="empty-tag">No imports detected.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;

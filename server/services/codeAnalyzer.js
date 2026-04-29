import fs from 'fs';

const analyzeFile = (content, filename) => {
    let functions = [];
    let classes = [];
    let imports = [];

    const lines = content.split('\n');

    // JS/TS
    if (filename.match(/\.(js|jsx|ts|tsx)$/)) {
        lines.forEach(line => {
            if (line.includes('function ')) {
                let match = line.match(/function\s+([a-zA-Z0-9_]+)/);
                if (match) functions.push(match[1]);
            }
            if (line.includes('const ') && line.includes('=>')) {
                let match = line.match(/const\s+([a-zA-Z0-9_]+)\s*=/);
                if (match) functions.push(match[1]);
            }
            if (line.includes('class ')) {
                let match = line.match(/class\s+([a-zA-Z0-9_]+)/);
                if (match) classes.push(match[1]);
            }
            if (line.includes('import ')) {
                let match = line.match(/import\s+.*from\s+['"](.*)['"]/);
                if (match) imports.push(match[1]);
            }
            if (line.includes('require(')) {
                let match = line.match(/require\(['"](.*)['"]\)/);
                if (match) imports.push(match[1]);
            }
        });
    }
    // Python
    else if (filename.match(/\.py$/)) {
        lines.forEach(line => {
            let defMatch = line.match(/^\s*def\s+([a-zA-Z0-9_]+)\s*\(/);
            if (defMatch) functions.push(defMatch[1]);
            
            let classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)/);
            if (classMatch) classes.push(classMatch[1]);
            
            let importMatch = line.match(/^\s*import\s+([a-zA-Z0-9_\.]+)/);
            if (importMatch) imports.push(importMatch[1]);
            
            let fromImportMatch = line.match(/^\s*from\s+([a-zA-Z0-9_\.]+)\s+import/);
            if (fromImportMatch) imports.push(fromImportMatch[1]);
        });
    }
    // C/C++
    else if (filename.match(/\.(c|cpp|h|hpp)$/)) {
        lines.forEach(line => {
            let includeMatch = line.match(/^\s*#include\s*[<"]([^>"]+)[>"]/);
            if (includeMatch) imports.push(includeMatch[1]);
            
            let classMatch = line.match(/^\s*(class|struct)\s+([a-zA-Z0-9_]+)/);
            if (classMatch) classes.push(classMatch[2]);
            
            let funcMatch = line.match(/^\s*(?:[\w:]+(?:\s*[\*&]+)?\s+)+([a-zA-Z_]\w*)\s*\(/);
            if (funcMatch && !funcMatch[0].includes('return')) {
                const keywords = ['if', 'while', 'for', 'switch', 'catch', 'sizeof'];
                if (!keywords.includes(funcMatch[1])) {
                    functions.push(funcMatch[1]);
                }
            }
        });
    }

    return { functions, classes, imports };
};

export { analyzeFile };

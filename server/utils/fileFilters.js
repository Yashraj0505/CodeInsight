import path from "path";

export const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".vscode", ".idea",
  "dist", "build", ".next", "__pycache__", ".cache",
]);

export const IGNORED_EXTENSIONS = new Set([
  ".exe", ".dll", ".log", ".lock",
  ".png", ".jpg", ".jpeg", ".gif",
  ".zip", ".tar", ".gz", ".pdf", ".iso", ".bin"
]);

export const MAX_FILE_SIZE = 1024 * 1024; // 1MB
export const MAX_FILES = 500;

export const shouldIgnore = (filePath, fileSize = 0) => {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");
  
  // Rule: Do NOT traverse ignored folders
  if (parts.some((p) => IGNORED_DIRS.has(p))) return true;
  
  // Rule: Skip ignored extensions
  const ext = path.extname(normalizedPath).toLowerCase();
  if (IGNORED_EXTENSIONS.has(ext)) return true;
  
  // Rule: Skip files > 1MB
  if (fileSize > MAX_FILE_SIZE) return true;
  
  return false;
};

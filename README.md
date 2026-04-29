# CodeInsight

> An AI-powered full-stack code analysis platform. Upload any codebase — explore its structure, view syntax-highlighted code, and chat with an AI assistant that understands your code.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Folder Structure](#folder-structure)
6. [Authentication Flow](#authentication-flow)
7. [Project Ingestion Pipeline](#project-ingestion-pipeline)
8. [Code Analysis Engine](#code-analysis-engine)
9. [AI Chat System](#ai-chat-system)
10. [Cloud Storage (Cloudinary)](#cloud-storage-cloudinary)
11. [API Reference](#api-reference)
12. [Database Schema](#database-schema)
13. [Environment Variables](#environment-variables)
14. [Setup & Installation](#setup--installation)
15. [Running the Application](#running-the-application)
16. [How to Use](#how-to-use)
17. [Security Considerations](#security-considerations)
18. [Performance Optimizations](#performance-optimizations)
19. [Future Improvements](#future-improvements)

---

## What It Does

Developers often spend significant time understanding unfamiliar codebases. **CodeInsight** solves this by letting you:

- Upload a project (ZIP, folder, or GitHub URL)
- Instantly visualize its file tree and code structure
- Ask natural language questions about the code

The AI assistant uses actual file content as context, giving accurate, code-aware answers powered by **Groq's Llama 3.1** model.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **3 Upload Methods** | ZIP archive, local folder selection, or GitHub repository URL |
| **Automatic Code Analysis** | Extracts functions, classes, and imports from JS/TS, Python, and C/C++ files |
| **AI Chat Assistant** | Powered by Groq (Llama 3.1 8B Instant) — answers questions with full file context |
| **Interactive File Explorer** | Collapsible file tree with syntax-highlighted code viewer |
| **Firebase Authentication** | Email/Password (with mandatory email verification) + Google Sign-In |
| **Per-User Data Isolation** | Every DB query is scoped to the authenticated user's Firebase UID |
| **Cloud File Storage** | Uploaded files stored on Cloudinary (not local disk) |
| **Startup Reindexer** | Automatically re-syncs any projects missing from MongoDB on server start |
| **Resizable Panels** | Drag-to-resize sidebar, code viewer, and chat panel |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | ^19.2.5 | UI framework |
| Vite | ^8.0.10 | Build tool & dev server |
| React Router DOM | ^7.14.2 | Client-side routing |
| Firebase JS SDK | ^12.12.1 | Authentication client |
| Lucide React | ^1.11.0 | Icon components |
| React Markdown | ^10.1.0 | Render AI responses as Markdown |
| React Syntax Highlighter | ^16.1.1 | Syntax-highlighted code viewer |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | ^5.2.1 | HTTP server and routing |
| Mongoose | ^9.6.0 | MongoDB ODM |
| Firebase Admin SDK | ^13.8.0 | Server-side token verification |
| Multer | ^2.1.1 | Multipart file upload (memory buffer) |
| adm-zip | ^0.5.17 | ZIP extraction |
| Axios | ^1.15.2 | GitHub zipball download + Cloudinary fetch |
| Groq SDK | ^1.1.2 | AI chat via Llama 3.1 |
| Cloudinary | ^2.10.0 | Cloud file storage |
| dotenv | ^17.4.2 | Environment variable management |
| cors | ^2.8.6 | Cross-origin request headers |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│   Firebase Auth → Dashboard → File Explorer → AI Chat       │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS + Authorization: Bearer <token>
┌──────────────────────────▼──────────────────────────────────┐
│                    Express Backend                           │
│   protect middleware → Firebase Admin verifyIdToken()        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Project    │  │     Code     │  │    AI Chat       │  │
│  │  Controller  │  │   Analyzer   │  │   Controller     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼───────────────────┼────────────┘
          │                │                   │
    ┌─────▼──────┐   ┌─────▼──────┐    ┌──────▼──────┐
    │  MongoDB   │   │ Cloudinary │    │  Groq API   │
    │  users     │   │  (files)   │    │  Llama 3.1  │
    │  projects  │   └────────────┘    └─────────────┘
    │  files     │
    └────────────┘
```

### Request Lifecycle

1. Frontend sends request with `Authorization: Bearer <Firebase ID Token>`
2. `protect` middleware calls `admin.auth().verifyIdToken(token)`
3. If valid — user is looked up or created in MongoDB; `req.user` is populated
4. Controller runs the query scoped to `req.user.uid`
5. Response returned to frontend

---

## Folder Structure

```
CodeInsight/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth.jsx             # Login / Register (Email + Google)
│   │   │   └── Dashboard.jsx        # Project list, upload, logout
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Collapsible file tree (recursive TreeNode)
│   │   │   ├── CodeViewer.jsx       # Syntax-highlighted viewer + analysis cards
│   │   │   ├── QuestionPanel.jsx    # AI chat interface with message history
│   │   │   └── FileUpload.jsx       # ZIP / folder / GitHub upload tabs
│   │   ├── utils/
│   │   │   └── api.js               # apiFetch() — attaches Bearer token to all requests
│   │   ├── firebase.js              # Firebase client SDK init
│   │   ├── App.jsx                  # Routes, ProtectedRoute, onAuthStateChanged
│   │   └── App.css                  # All application styles (dark theme)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Node.js + Express backend
│   ├── config/
│   │   ├── db.js                    # Mongoose connection
│   │   ├── firebase.js              # Firebase Admin SDK init
│   │   ├── cloudinary.js            # Cloudinary SDK init
│   │   └── serviceAccountKey.json   # Firebase service account — NOT in git
│   ├── controllers/
│   │   ├── projectController.js     # Upload, list, delete, structure, file content
│   │   └── chatController.js        # Groq AI chat with file/project context
│   ├── middleware/
│   │   ├── authMiddleware.js        # Token verification + MongoDB user upsert
│   │   └── error.middleware.js      # Global error handler
│   ├── models/
│   │   └── File.js                  # Mongoose File schema
│   ├── modules/
│   │   ├── auth/
│   │   │   └── user.model.js        # Mongoose User schema (firebaseUid)
│   │   ├── project/
│   │   │   └── project.model.js     # Mongoose Project schema
│   │   └── chat/
│   │       └── chat.routes.js       # Module-level chat routes
│   ├── routes/
│   │   └── api.js                   # Legacy API routes (fully working)
│   ├── services/
│   │   ├── codeAnalyzer.js          # Regex extractor for JS/TS, Python, C/C++
│   │   ├── projectService.js        # Directory walker + Cloudinary upload + DB insert
│   │   ├── storageService.js        # Cloudinary upload/delete helpers
│   │   └── reindexer.js             # Startup sync: missing projects → MongoDB
│   ├── utils/
│   │   ├── fileFilters.js           # IGNORED_DIRS, IGNORED_EXTENSIONS, MAX_FILES
│   │   └── asyncHandler.js          # Async error wrapper for controllers
│   ├── server.js                    # Express entry point
│   ├── .env                         # Environment variables — NOT in git
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Authentication Flow

```
User submits email/password  ──OR──  clicks "Continue with Google"
        │                                        │
        ▼                                        ▼
signInWithEmailAndPassword()         signInWithPopup(GoogleAuthProvider)
        │                                        │
        ├─ emailVerified === false               │
        │  → block login, show error             │
        │  → do NOT store token                  │
        │                                        │
        ▼                                        ▼
        user.getIdToken()  ←─────────────────────┘
        │
        ▼
localStorage.setItem("token", token)
        │
        ▼
Every API call → apiFetch() → Authorization: Bearer <token>
        │
        ▼
Backend: admin.auth().verifyIdToken(token)
        │
        ├─ Invalid / expired → 401 Unauthorized
        │
        ▼
User.findOne({ firebaseUid: decoded.uid })
        │
        ├─ Not found → User.create({ firebaseUid, email })   [first login]
        │
        ▼
req.user = { uid, email, _id }
All DB queries scoped to req.user.uid
```

**Token refresh:** `onAuthStateChanged` in `App.jsx` fires whenever Firebase silently refreshes the token (every hour). It calls `user.getIdToken(true)` (force refresh) and updates `localStorage` automatically — no re-login required.

**Email verification:** On register, `sendEmailVerification()` is called and the user is immediately signed out. They must click the verification link before logging in. Google users skip this step as Google pre-verifies accounts.

---

## Project Ingestion Pipeline

```
User uploads ZIP / Folder / GitHub URL
        │
        ▼
Multer stores files in memory buffer (50MB limit)
        │
        ▼
projectController creates Project document in MongoDB
  { name, userId: req.user.uid, uploadTime }
        │
        ├─ ZIP      → adm-zip extracts to OS temp directory
        ├─ Folder   → files written preserving webkitRelativePath
        └─ GitHub   → axios streams zipball → adm-zip extracts
                      → unwraps GitHub's root wrapper folder
        │
        ▼
projectService.processProject() traverses the temp directory
        │
        ▼
fileFilters.shouldIgnore() skips:
  Dirs:  node_modules, .git, .vscode, dist, build, __pycache__, .next, .cache
  Exts:  .exe .dll .log .lock .png .jpg .gif .zip .tar .gz .pdf .bin .iso
  Size:  files > 1MB
  Limit: max 500 files per project
        │
        ▼
For each valid file (in parallel via Promise.all):
  1. Read file buffer from temp disk
  2. Upload buffer to Cloudinary → get secure URL
  3. Run codeAnalyzer.analyzeFile() → extract functions, classes, imports
        │
        ▼
File.insertMany() → bulk insert all file docs to MongoDB
Project.fileCount updated
Temp directory cleaned up
```

---

## Code Analysis Engine

Located in `server/services/codeAnalyzer.js`. Uses **regex-based parsing** — no AST dependency.

### JavaScript / TypeScript / JSX / TSX
| What | Pattern |
|------|---------|
| Named functions | `function functionName(` |
| Arrow functions | `const name = ... =>` |
| Classes | `class ClassName` |
| ES imports | `import ... from 'source'` |
| CommonJS requires | `require('source')` |

### Python
| What | Pattern |
|------|---------|
| Functions | `def functionName(` |
| Classes | `class ClassName` |
| Imports | `import module` |
| From imports | `from module import` |

### C / C++ / H / HPP
| What | Pattern |
|------|---------|
| Includes | `#include <header>` or `#include "header"` |
| Classes & Structs | `class Name` / `struct Name` |
| Function signatures | Return-type + name + `(` pattern |

---

## AI Chat System

Located in `server/controllers/chatController.js`.

**Model:** Groq `llama-3.1-8b-instant` — Temperature: `0.5`, Max tokens: `1500`

### Context Strategy

| Scenario | Context Sent to AI |
|----------|-------------------|
| File selected | Full file content (truncated to 3000 chars) + function list |
| No file, project selected | Summary of up to 20 files — paths + top 5 functions each |
| No context | Generic "no context provided" message |

**System prompt** instructs the AI to:
- Respond in structured Markdown
- Use fenced code blocks for code examples
- Reference specific functions/classes from the provided context
- Be practical and student-friendly

---

## Cloud Storage (Cloudinary)

Files are **no longer stored on local disk**. After extraction to a temp directory, each file is uploaded to **Cloudinary** as a raw resource.

- Storage path format: `projects/<projectId>/<relativePath>`
- The `secure_url` returned by Cloudinary is saved in the `File` document as `url`
- When a project is deleted, `deleteProjectFiles()` calls Cloudinary's `delete_resources_by_prefix` API to remove all associated files
- File content is fetched on-demand via `axios.get(file.url)` when viewing or chatting

---

## API Reference

All endpoints require `Authorization: Bearer <Firebase ID Token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/project/upload` | Upload ZIP or folder (`multipart/form-data`, field: `files`) |
| `POST` | `/api/project/github` | Import a GitHub repo by URL (`{ repoUrl }`) |
| `GET` | `/api/projects` | List all projects for the authenticated user |
| `DELETE` | `/api/project/:projectId` | Delete project, file records, and Cloudinary files |
| `GET` | `/api/project/:projectId/structure` | Get flat file list `[{ id, path, name }]` |
| `GET` | `/api/project/:projectId/file/:fileId` | Get file content + analysis + explanation |
| `POST` | `/api/chat` | Ask the AI a question with optional file/project context |
| `GET` | `/health` | Health check — returns `{ status: "ok", db: "connected" }` |

### Upload Request (`multipart/form-data`)
```
files[]     — one or more files
paths       — JSON array of relative paths (for folder uploads)
projectName — display name for the project
```

### Chat Request Body
```json
{
  "question":      "What does the processProject function do?",
  "contextFileId": "<mongoFileId>",
  "projectId":     "<mongoProjectId>"
}
```

### Chat Response
```json
{
  "answer": "The `processProject` function walks the directory tree..."
}
```

### Error Responses
```json
{ "error": "Unauthorized: No token provided" }   // 401
{ "error": "Forbidden" }                          // 403
{ "error": "Project not found" }                  // 404
```

---

## Database Schema

### User (`users` collection)
```js
{
  firebaseUid: String,   // required, unique — links Firebase UID to MongoDB
  email:       String,
  createdAt:   Date,     // auto (timestamps: true)
  updatedAt:   Date
}
```

### Project (`projects` collection)
```js
{
  name:       String,    // required — display name
  userId:     String,    // Firebase UID — scopes project to one user
  fileCount:  Number,    // updated after ingestion
  uploadTime: Number,    // Unix timestamp (ms)
  createdAt:  Date,
  updatedAt:  Date
}
```

### File (`files` collection)
```js
{
  projectId:  ObjectId,  // ref: Project
  name:       String,    // filename only (e.g. "App.jsx")
  path:       String,    // relative path within project (e.g. "src/App.jsx")
  url:        String,    // Cloudinary secure_url for fetching content
  analysis: {
    functions: [String], // extracted function/method names
    classes:   [String], // extracted class names
    imports:   [String]  // extracted import/require sources
  }
}
```

---

## Environment Variables

### `server/.env`

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/codeinsight
GROQ_API_KEY=gsk_your_groq_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=http://localhost:5173
```

All 6 variables (`MONGO_URI`, `GROQ_API_KEY`, `PORT`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are validated at startup — the server exits immediately if any are missing.

---

## Setup & Installation

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **MongoDB** running locally on port `27017` — [mongodb.com](https://www.mongodb.com/try/download/community)
- **Firebase project** with Email/Password and Google auth enabled — [console.firebase.google.com](https://console.firebase.google.com)
- **Groq API key** (free tier available) — [console.groq.com](https://console.groq.com)
- **Cloudinary account** (free tier available) — [cloudinary.com](https://cloudinary.com)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/CodeInsight.git
cd CodeInsight
```

### Step 2 — Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### Step 3 — Configure backend environment

Create `server/.env` with all variables listed in the [Environment Variables](#environment-variables) section above.

### Step 4 — Firebase service account (backend)

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Gear icon → **Project Settings** → **Service Accounts** tab
3. Click **"Generate new private key"** → **"Generate Key"**
4. Rename the downloaded file to `serviceAccountKey.json`
5. Place it at `server/config/serviceAccountKey.json`

> This file is in `.gitignore`. Never commit it.

### Step 5 — Firebase client SDK (frontend)

Edit `client/src/firebase.js`:

```js
const firebaseConfig = {
  apiKey:            "your-api-key",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId:             "your-app-id"
};
```

Find these values at: Firebase Console → Project Settings → General → **Your apps**.

### Step 6 — Enable Firebase Auth providers

Firebase Console → **Authentication** → **Sign-in method**:
- ✅ Enable **Email/Password**
- ✅ Enable **Google**
- Under **Authorized domains** → confirm `localhost` is listed

### Step 7 — Start MongoDB

```bash
# Windows (if installed as a service, it may already be running)
"C:\Program Files\MongoDB\Server\<version>\bin\mongod.exe"

# Verify connection
mongosh
```

---

## Running the Application

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
npm start
```

Expected output:
```
✅ Server running on http://localhost:5000
GROQ KEY: set
✅ MongoDB Connected: 127.0.0.1
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

### Development Mode (auto-restart)

```bash
# Backend with Node --watch
cd server
npm run dev

# Frontend already has HMR via Vite
cd client
npm run dev
```

### Common Startup Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing required environment variables` | `.env` incomplete | Add all 6 required variables |
| `Cannot find module './serviceAccountKey.json'` | Service account missing | Follow Step 4 |
| `MongoDB connection failed` | MongoDB not running | Start `mongod` |
| `401 Unauthorized` on all API calls | Token missing or expired | Check `localStorage.token` in DevTools; re-login |
| `auth/invalid-api-key` on frontend | Wrong Firebase config | Re-check `client/src/firebase.js` |

---

## How to Use

### 1. Register / Login
- Open `http://localhost:5173` — redirected to `/auth` automatically
- **Register:** enter email + password → verification email sent → click the link → log in
- **Google:** click "Continue with Google" → instant access

### 2. Upload a Project
From the Dashboard, pick an upload method:
- **📦 ZIP** — upload a `.zip` archive
- **📁 Folder** — select a local directory (preserves folder structure via `webkitRelativePath`)
- **🔗 GitHub** — paste a public GitHub repo URL (e.g. `https://github.com/user/repo`)

Processing takes a few seconds; the project card appears when done.

### 3. Explore the Code
- Click **"Open Workspace"** on any project card
- Browse the collapsible file tree in the left sidebar
- Click any file to view syntax-highlighted content
- Analysis cards below the code show extracted **Functions**, **Classes**, and **Dependencies**
- Drag the dividers between panels to resize them

### 4. Chat with the AI
- Type a question in the chat panel on the right
- With a file open → AI uses that file's content as context
- Without a file → AI uses a summary of all project files
- Example questions:
  - *"What does the `processProject` function do?"*
  - *"Explain the imports in this file"*
  - *"How is authentication handled here?"*

### 5. Delete a Project
- Click the trash icon on any project card
- Removes the project from MongoDB, all file records, and all Cloudinary files

### 6. Logout
- Click **Logout** in the top-right of the Dashboard
- Clears Firebase session and `localStorage` token

---

## Security Considerations

- **Token verification** — every protected route calls `admin.auth().verifyIdToken()` before any logic runs. Missing, malformed, or expired tokens return `401` immediately.
- **Data isolation** — all DB queries include `userId: req.user.uid`. A user cannot read, modify, or delete another user's projects even with a known project ID — they receive `403 Forbidden`.
- **Ownership checks** — `deleteProject`, `getStructure`, and `getFileAnalysis` all verify `project.userId === req.user.uid` before returning data.
- **Path traversal prevention** — `hasDotDot()` checks all uploaded file paths; `fullPath.startsWith(tempDir)` ensures no file is written outside the temp directory.
- **Filename sanitization** — `sanitizeFilename()` strips non-alphanumeric characters from uploaded filenames.
- **Service account key** — stored only on the server filesystem, in `.gitignore`, never sent to the client.
- **Email verification** — email/password users must verify before the frontend stores a token.
- **File upload limits** — Multer enforces a 50MB per-request limit. The file processor skips files over 1MB and caps projects at 500 files.
- **Environment validation** — server exits at startup if any required environment variable is missing.

---

## Performance Optimizations

- **File filtering** — `node_modules`, `.git`, `dist`, `build`, binary files, images, and lock files are skipped during ingestion
- **Parallel processing** — `Promise.all()` in `projectService.js` uploads to Cloudinary and analyzes all files concurrently
- **Bulk DB insert** — `File.insertMany()` writes all file documents in a single MongoDB operation
- **Content truncation** — file content sent to the AI is capped at 3000 characters to stay within Groq token limits
- **Project summary fallback** — when no file is selected, the AI receives a lightweight summary (file paths + top 5 functions per file, max 20 files) instead of full file contents
- **Startup reindexer** — `reindexer.js` runs on server start and syncs any projects missing from MongoDB
- **Temp directory cleanup** — extracted files are deleted from the OS temp directory after Cloudinary upload, regardless of success or failure (`finally` block)
- **Max file cap** — 500 files per project prevents runaway ingestion on very large repositories

---

## Future Improvements

- **AST-based analysis** — replace regex parsing with proper AST parsers (Babel for JS/TS, Python `ast` module, `libclang` for C/C++) for more accurate extraction
- **Chat history persistence** — store conversation history in MongoDB so users can revisit previous AI sessions
- **Full-text code search** — search across all files in a project by keyword or symbol name
- **Project report generation** — export a PDF or Markdown summary of a project's structure and AI-generated overview
- **Collaboration** — share projects with other users with read-only or comment access
- **Complexity metrics** — cyclomatic complexity, lines of code, and dependency graphs per file
- **Webhook-based GitHub sync** — automatically re-import a repository when new commits are pushed
- **Support more languages** — Go, Rust, Java, Ruby analysis in `codeAnalyzer.js`
- **Streaming AI responses** — stream Groq responses token-by-token for a better chat UX

---

## License

This project is currently unlicensed. All rights reserved by the author.
To use, modify, or distribute this project, please contact the repository owner.

---

<div align="center">
  Built with React, Node.js, Firebase, MongoDB, Cloudinary, and Groq AI
</div>

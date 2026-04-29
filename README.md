# CodeInsight

An AI-powered full-stack code analysis platform. Upload any codebase via ZIP, folder, or GitHub URL — explore its file tree, view syntax-highlighted code, and chat with an AI assistant that understands your code. Secured with Firebase Authentication and backed by MongoDB.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Authentication Flow](#authentication-flow)
- [Project Ingestion Pipeline](#project-ingestion-pipeline)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Dependencies](#dependencies)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [How to Use](#how-to-use)
- [Security Considerations](#security-considerations)
- [Performance Optimizations](#performance-optimizations)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## What It Does

Developers often spend significant time understanding unfamiliar codebases. CodeInsight solves this by letting you upload a project, instantly visualize its file tree and code structure, and ask natural language questions about it. The AI assistant uses the actual file content as context, giving you accurate, code-aware answers.

---

## Key Features

- **Three upload methods** — ZIP archive, local folder, or GitHub repository URL
- **Automatic code analysis** — extracts functions, classes, and imports from JS/TS, Python, and C/C++ files using regex-based parsing
- **AI chat assistant** — powered by Groq (Llama 3.1), answers questions about your code with full file context
- **Interactive file explorer** — collapsible file tree with syntax-highlighted code viewer
- **Firebase Authentication** — Email/Password (with mandatory email verification) and Google Sign-In
- **Per-user data isolation** — every database query is scoped to the authenticated user's Firebase UID
- **Persistent storage** — projects and file metadata stored in MongoDB; uploaded files stored on disk
- **Startup reindexer** — automatically re-syncs any projects on disk that are missing from MongoDB

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + Vite |
| Routing | React Router DOM v7 |
| Auth (client) | Firebase JS SDK v12 |
| UI icons | Lucide React |
| Markdown rendering | React Markdown |
| Syntax highlighting | React Syntax Highlighter |
| Backend framework | Express 5 (Node.js 18+) |
| Database | MongoDB via Mongoose 9 |
| Auth (server) | Firebase Admin SDK v13 |
| File upload | Multer v2 |
| ZIP extraction | adm-zip |
| GitHub download | Axios |
| AI chat | Groq SDK (Llama 3.1 8B Instant) |
| Environment config | dotenv |
| Cross-origin | cors |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Auth (Firebase SDK) → Dashboard → File Explorer → Chat │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS + Authorization: Bearer <token>
┌────────────────────────▼────────────────────────────────┐
│                   Express Backend                        │
│  protect middleware → Firebase Admin verifyIdToken()     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Project    │  │   File       │  │   AI Chat     │  │
│  │  Controller │  │   Analysis   │  │   Controller  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                  │
    ┌─────▼──────┐   ┌─────▼──────┐    ┌─────▼──────┐
    │  MongoDB   │   │   Disk     │    │  Groq API  │
    │  users     │   │  uploads/  │    │  Llama 3.1 │
    │  projects  │   │  <files>   │    │            │
    │  files     │   └────────────┘    └────────────┘
    └────────────┘
```

**Request lifecycle:**
1. Frontend sends request with `Authorization: Bearer <Firebase ID Token>`
2. `protect` middleware calls `admin.auth().verifyIdToken(token)`
3. If valid — user is looked up or created in MongoDB, `req.user` is populated
4. Controller runs the query scoped to `req.user.uid`
5. Response returned to frontend

---

## Folder Structure

```
CodeInsight/
│
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
│   │   ├── firebase.js              # Firebase client SDK init + auth export
│   │   ├── App.jsx                  # Routes, ProtectedRoute, onAuthStateChanged
│   │   ├── App.css                  # All application styles (dark theme, layout)
│   │   ├── index.css                # Root reset styles
│   │   └── main.jsx                 # ReactDOM.createRoot + BrowserRouter
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Node.js + Express backend
│   ├── config/
│   │   ├── db.js                    # Mongoose connection
│   │   ├── firebase.js              # Firebase Admin SDK init (createRequire for JSON)
│   │   └── serviceAccountKey.json   # Firebase service account — NOT in git
│   ├── controllers/
│   │   ├── projectController.js     # Upload, list, delete, structure, file content
│   │   └── chatController.js        # Groq AI chat with file/project context
│   ├── middleware/
│   │   └── authMiddleware.js        # Token verification + MongoDB user upsert
│   ├── models/
│   │   └── File.js                  # Mongoose File schema
│   ├── modules/
│   │   ├── auth/
│   │   │   └── user.model.js        # Mongoose User schema (firebaseUid)
│   │   └── project/
│   │       └── project.model.js     # Mongoose Project schema (userId field)
│   ├── routes/
│   │   └── api.js                   # All protected API routes (legacy, fully working)
│   ├── services/
│   │   ├── codeAnalyzer.js          # Regex extractor for JS/TS, Python, C/C++
│   │   ├── projectService.js        # Directory walker + parallel file processing
│   │   └── reindexer.js             # Startup sync: disk → MongoDB
│   ├── utils/
│   │   └── fileFilters.js           # IGNORED_DIRS, IGNORED_EXTENSIONS, MAX_FILES
│   ├── uploads/                     # Uploaded project files (not in git)
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
        │                                       │
        ▼                                       ▼
signInWithEmailAndPassword()          signInWithPopup(GoogleAuthProvider)
        │                                       │
        ├─ emailVerified === false              │
        │  → block login, show error            │
        │  → do NOT store token                 │
        │                                       │
        ▼                                       ▼
        user.getIdToken()  ←────────────────────┘
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

**Token refresh:** `onAuthStateChanged` in `App.jsx` fires whenever Firebase silently refreshes the token (every hour). It updates `localStorage` automatically — no re-login required. If the user signs out, the token is removed and they are redirected to `/auth`.

**Email verification:** On register, `sendEmailVerification()` is called and the user is immediately signed out. They must click the link in their inbox before they can log in. Google users skip this step as Google pre-verifies accounts.

---

## Project Ingestion Pipeline

```
User uploads ZIP / folder / GitHub URL
        │
        ▼
Multer stores files in memory buffer (50MB limit)
        │
        ▼
projectController creates Project document in MongoDB
  { name, userId: req.user.uid, uploadTime }
        │
        ├─ ZIP      → adm-zip extracts to uploads/<projectId>/
        ├─ Folder   → files written preserving webkitRelativePath
        └─ GitHub   → axios streams zipball → adm-zip extracts
                      → unwraps GitHub's root wrapper folder
        │
        ▼
projectService.processProject() traverses the directory
        │
        ▼
fileFilters.shouldIgnore() skips:
  Dirs:  node_modules, .git, .vscode, dist, build, __pycache__, .next
  Exts:  .exe .dll .log .lock .png .jpg .gif .zip .tar .gz .pdf .bin
  Size:  files > 1MB
  Limit: max 500 files per project
        │
        ▼
codeAnalyzer.analyzeFile() runs per file:
  JS/TS/JSX/TSX → function declarations, arrow functions, classes, imports, require()
  Python        → def, class, import, from...import
  C/C++/H/HPP   → #include, class/struct, function signatures
        │
        ▼
Promise.all() processes all files in parallel
        │
        ▼
File.insertMany() → bulk insert to MongoDB
Project.fileCount updated
.codeinsight.json metadata file written to project folder
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <Firebase ID Token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/project/upload` | Upload ZIP or folder (`multipart/form-data`, field: `files`) |
| `POST` | `/api/project/github` | Import a GitHub repo by URL (`{ repoUrl }`) |
| `GET` | `/api/projects` | List all projects for the authenticated user |
| `DELETE` | `/api/project/:projectId` | Delete a project, its files, and its folder on disk |
| `GET` | `/api/project/:projectId/structure` | Get flat file list `[{ id, path, name }]` |
| `GET` | `/api/project/:projectId/file/:fileId` | Get file content + analysis + explanation |
| `POST` | `/api/chat` | Ask the AI a question with optional file/project context |

**Upload request** (`multipart/form-data`):
```
files[]     — one or more files
paths       — JSON array of relative paths (for folder uploads)
projectName — display name for the project
```

**Chat request body:**
```json
{
  "question":      "What does the processProject function do?",
  "contextFileId": "<mongoFileId>",
  "projectId":     "<mongoProjectId>"
}
```

**Chat response:**
```json
{
  "answer": "The `processProject` function walks the directory tree..."
}
```

**Error responses:**
```json
{ "error": "Unauthorized: No token provided" }   // 401
{ "error": "Forbidden" }                          // 403
{ "error": "Project not found" }                  // 404
```

---

## Database Schema

**User** (`users` collection)
```js
{
  firebaseUid: String,   // required, unique — links Firebase UID to MongoDB
  email:       String,
  createdAt:   Date,     // auto (timestamps: true)
  updatedAt:   Date
}
```

**Project** (`projects` collection)
```js
{
  name:       String,    // required
  userId:     String,    // Firebase UID — scopes project to one user
  fileCount:  Number,    // updated after ingestion
  uploadTime: Number,    // Unix timestamp (ms)
  createdAt:  Date,
  updatedAt:  Date
}
```

**File** (`files` collection)
```js
{
  projectId:  ObjectId,  // ref: Project — compound index with path
  name:       String,    // filename only (e.g. "App.jsx")
  path:       String,    // relative path within project (e.g. "src/App.jsx")
  savedPath:  String,    // absolute path on disk
  analysis: {
    functions: [String], // extracted function/method names
    classes:   [String], // extracted class names
    imports:   [String]  // extracted import/require sources
  }
}
```

---

## Dependencies

### Backend (`server/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | HTTP server and routing |
| `mongoose` | ^9.6.0 | MongoDB ODM |
| `firebase-admin` | ^13.8.0 | Server-side Firebase token verification |
| `dotenv` | ^17.4.2 | Load `.env` variables |
| `cors` | ^2.8.6 | Cross-origin request headers |
| `multer` | ^2.1.1 | Multipart file upload handling |
| `adm-zip` | ^0.5.17 | ZIP extraction |
| `axios` | ^1.15.2 | HTTP client for GitHub zipball download |
| `groq-sdk` | ^1.1.2 | Groq AI API client (Llama 3.1) |

Install all backend dependencies:
```bash
cd server
npm install
```

### Frontend (`client/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.5 | UI framework |
| `react-dom` | ^19.2.5 | React DOM renderer |
| `react-router-dom` | ^7.14.2 | Client-side routing |
| `firebase` | ^12.12.1 | Firebase Auth client SDK |
| `lucide-react` | ^1.11.0 | Icon components |
| `react-markdown` | ^10.1.0 | Render AI responses as Markdown |
| `react-syntax-highlighter` | ^16.1.1 | Syntax-highlighted code viewer |

**Dev dependencies:**

| Package | Purpose |
|---------|---------|
| `vite` | Build tool and dev server |
| `@vitejs/plugin-react` | Vite plugin for React/JSX |
| `eslint` + plugins | Linting |

Install all frontend dependencies:
```bash
cd client
npm install
```

---

## Setup Instructions

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **MongoDB** running locally on port `27017` — [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- **Firebase project** with Email/Password and Google auth enabled — [console.firebase.google.com](https://console.firebase.google.com)
- **Groq API key** (free) — [console.groq.com](https://console.groq.com)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/CodeInsight.git
cd CodeInsight
```

---

### Step 2 — Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

---

### Step 3 — Configure backend environment

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/codeinsight
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

### Step 4 — Firebase service account (backend)

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Click the gear icon → **Project Settings** → **Service Accounts** tab
3. Click **"Generate new private key"** → **"Generate Key"**
4. Rename the downloaded file to `serviceAccountKey.json`
5. Place it at:

```
server/config/serviceAccountKey.json
```

> This file is in `.gitignore`. Never commit it.

---

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

Find these values at: Firebase Console → Project Settings → General → **Your apps** → SDK setup and configuration.

---

### Step 6 — Enable Firebase Auth providers

Firebase Console → **Authentication** → **Sign-in method**:

- ✅ Enable **Email/Password**
- ✅ Enable **Google**
- Under **Authorized domains** → confirm `localhost` is listed

---

### Step 7 — Start MongoDB

```bash
# macOS / Linux
mongod

# Windows (if installed as a service, it's already running)
# Or start manually:
"C:\Program Files\MongoDB\Server\<version>\bin\mongod.exe"
```

Verify it's running:
```bash
mongosh
# Should connect to mongodb://127.0.0.1:27017
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
🔍 Reindexer: found X folder(s) in uploads/
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

### Development mode (auto-restart on file changes)

```bash
# Backend with auto-restart (Node 18+ built-in)
cd server
npm run dev

# Frontend already has HMR via Vite
cd client
npm run dev
```

---

### Common startup errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module './serviceAccountKey.json'` | Service account file missing | Follow Step 4 above |
| `GROQ KEY: undefined` | `.env` not found or wrong path | Ensure `server/.env` exists with `GROQ_API_KEY=...` |
| `MongoDB connection failed` | MongoDB not running | Start `mongod` |
| `401 Unauthorized` on all API calls | Token not attached or expired | Check `localStorage.token` in DevTools; re-login |
| `auth/invalid-api-key` on frontend | Wrong Firebase config | Re-check `client/src/firebase.js` values |
| `Blank white page` | JS import error | Open browser console, check for module errors |

---

## How to Use

**1. Register / Login**
- Open `http://localhost:5173` — redirected to `/auth` automatically
- **Register:** enter email + password → verification email sent → click the link in your inbox → log in
- **Google:** click "Continue with Google" → instant access (no verification needed)

**2. Upload a project**
- From the Dashboard, pick an upload method:
  - **📦 ZIP** — upload a `.zip` archive
  - **📁 Folder** — select a local directory (preserves folder structure)
  - **🔗 GitHub** — paste a public GitHub repo URL (e.g. `https://github.com/user/repo`)
- Processing takes a few seconds; the project card appears when done

**3. Explore the code**
- Click **"Open Workspace"** on any project card
- Browse the collapsible file tree in the left sidebar
- Click any file to view syntax-highlighted content
- Analysis cards below the code show extracted **Functions**, **Classes**, and **Dependencies**

**4. Chat with the AI**
- Type a question in the chat panel at the bottom
- With a file open → AI uses that file's content as context
- Without a file → AI uses a summary of all project files
- Example questions:
  - *"What does the `processProject` function do?"*
  - *"Explain the imports in this file"*
  - *"How is authentication handled here?"*
  - *"What is the purpose of this class?"*

**5. Delete a project**
- Click the trash icon on any project card
- Removes the project from MongoDB, all file records, and the folder on disk

**6. Logout**
- Click **Logout** in the top-right of the Dashboard
- Clears Firebase session and `localStorage` token

---

## Security Considerations

- **Token verification** — every protected route calls `admin.auth().verifyIdToken()` before any logic runs. Missing, malformed, or expired tokens return `401` immediately.
- **Data isolation** — all DB queries include `userId: req.user.uid`. A user cannot read, modify, or delete another user's projects even with a known project ID — they receive `403 Forbidden`.
- **Ownership checks** — `deleteProject`, `getStructure`, and `getFileAnalysis` all verify `project.userId === req.user.uid` before returning data.
- **Service account key** — stored only on the server filesystem, in `.gitignore`, never sent to the client.
- **Email verification** — email/password users must verify before the frontend stores a token. The user is signed out immediately after registration until they verify.
- **Token refresh** — `onAuthStateChanged` silently refreshes the Firebase token every hour. If the user signs out from any device, the token is invalidated server-side.
- **File upload limits** — Multer enforces a 50MB per-request limit. The file processor skips files over 1MB and caps projects at 500 files.

---

## Performance Optimizations

- **File filtering** — `node_modules`, `.git`, `dist`, `build`, `__pycache__`, binary files, images, and lock files are skipped during ingestion via `fileFilters.js`
- **Parallel processing** — `Promise.all()` in `projectService.js` processes all files concurrently instead of sequentially
- **Bulk DB insert** — `File.insertMany()` writes all file documents in a single MongoDB operation
- **Content truncation** — file content sent to the AI is capped at 3000 characters to stay within Groq token limits
- **Project summary fallback** — when no file is selected, the AI receives a lightweight summary (file paths + top 5 functions per file) instead of full file contents
- **Startup reindexer** — `reindexer.js` runs on server start and syncs any projects on disk that are missing from MongoDB, preventing data loss across restarts
- **Compound indexes** — MongoDB indexes on `{ projectId, path }` for fast file lookups within large projects
- **Max file cap** — 500 files per project prevents runaway ingestion on very large repositories

---

## Future Improvements

- **Cloud storage** — migrate uploaded files from local disk to AWS S3 or Google Cloud Storage for scalability and persistence across deployments
- **AST-based analysis** — replace regex parsing with proper AST parsers (Babel for JS/TS, Python `ast` module, `libclang` for C/C++) for more accurate extraction
- **Chat history persistence** — store conversation history in MongoDB so users can revisit previous AI sessions
- **Project report generation** — export a PDF or Markdown summary of a project's structure, complexity metrics, and AI-generated overview
- **Full-text code search** — search across all files in a project by keyword or symbol name
- **Collaboration** — share projects with other users with read-only or comment access
- **Complexity metrics** — cyclomatic complexity, lines of code, and dependency graphs per file
- **Webhook-based GitHub sync** — automatically re-import a repository when new commits are pushed
- **Support more languages** — Go, Rust, Java, Ruby analysis in `codeAnalyzer.js`

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add: your feature description"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request with a clear description of what changed and why

Please ensure your code:
- Follows the existing style (ES modules, async/await, no `var`)
- Does not break existing functionality
- Contains no committed secrets, credentials, or `serviceAccountKey.json`
- Has no `console.log` left in production paths

---

## License

This project is currently unlicensed. All rights reserved by the author.
To use, modify, or distribute this project, please contact the repository owner.

---

<div align="center">
  Built with React, Node.js, Firebase, MongoDB, and Groq AI
</div>

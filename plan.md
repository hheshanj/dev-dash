# devdash — Project Analyzer Dashboard

## Overview

A local-first developer dashboard that acts as a central hub for all your local repositories. By analyzing your `git` history and AI chat logs (Antigravity), it uses the Gemini API to generate a plain-English summary of each project's progress, completion status, and next actionable steps.

---

## The Problem

When managing multiple active or paused repositories, context switching is expensive. Developers often forget where they left off, what the immediate next step was, or what a project even is after months of inactivity. `devdash` provides a single pane of glass to instantly understand the state of any local project without manually opening the code, reading through git logs, or re-reading old chats.

---

## Architecture & Data Flow

**Type:** Monorepo (Node.js/Express Server + React/Vite Client)

### System Flow
1. **Scanning**: The backend scans the configured `REPOS_PATH` for folders containing `.git` directories.
2. **Data Extraction**: When a repo is analyzed, the backend gathers:
   - The last N commit messages and diffs via `simple-git`.
   - Relevant Antigravity chat logs from `CHAT_HISTORY_PATH` by matching repo paths or names.
3. **AI Processing**: This combined context is sent to the Gemini API with a strict system prompt.
4. **Storage**: The structured JSON response from Gemini is cached in a local SQLite database to prevent redundant API calls.
5. **Presentation**: The frontend queries the SQLite DB to display the dashboard and detailed project cards.

### Directory Structure
```
devdash/
├── server/
│   ├── index.js              # Express app entry
│   ├── db/
│   │   └── database.js       # SQLite connection and queries
│   ├── routes/
│   │   └── projects.js       # API endpoints for frontend
│   └── services/
│       ├── git.js            # simple-git wrappers (log, diff, status)
│       ├── chatlog.js        # parses Antigravity JSON logs
│       └── gemini.js         # API calls to Gemini Flash
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ProjectList.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   └── SummaryView.jsx
│   │   └── pages/
│   │       └── Dashboard.jsx
│   ├── index.html
│   └── vite.config.js
├── .env
├── package.json
└── README.md
```

---

## Tech Stack

| Layer      | Technology                                    | Justification |
|------------|-----------------------------------------------|---------------|
| **Backend**| Node.js + Express                             | Simple, fast filesystem access, rich ecosystem. |
| **Frontend**| React + Vite + Tailwind CSS                  | Fast builds, modern component structure, rapid UI styling. |
| **Git**    | `simple-git` (npm)                            | Reliable programmatic Git operations. |
| **Storage**| SQLite (`better-sqlite3`)                     | Zero-config, fast, synchronous local DB. |
| **AI**     | Google Gemini API (`@google/genai`)           | Large context window, fast (`gemini-2.5-flash`), generous free tier. |

---

## Local Configuration (Windows Setup)

The system relies on specific local paths defined in `.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=3001
# The root folder containing all your repositories
REPOS_PATH="D:\Work\Code\GitHub Repos"
# Antigravity's internal log directory
CHAT_HISTORY_PATH="C:\Users\Heshan Jayakody\.gemini\antigravity\brain"
# Max commits and chat entries to send to AI (controls context window size)
CONTEXT_LIMIT_COMMITS=20
CONTEXT_LIMIT_CHATS=5
```

---

## AI Agent Prompt Design

To ensure predictable UI rendering, the Gemini prompt must enforce a strict JSON output schema.

**System Prompt Example:**
```text
You are a senior developer handing over a project. Analyze the provided Git history and AI chat logs for a project named "{repo_name}".

Provide a highly structured, objective analysis. Do not hallucinate features not mentioned in the logs.

Output strictly as JSON matching this schema:
{
  "summary": "2-3 sentence plain English overview of the project's purpose and current state.",
  "completed_features": ["Feature A", "Feature B"],
  "in_progress": ["Feature C implementation", "Debugging issue X"],
  "abandoned_or_stalled": ["Attempted migration to Y (reverted)"],
  "completion_percentage": 75,
  "status": "active" | "stalled" | "completed",
  "last_meaningful_activity": "YYYY-MM-DD",
  "resumability_score": 8, // 1-10 scale indicating how easy it is to pick up where left off
  "next_suggested_step": "Fix the failing tests in config.js before proceeding to deployment."
}
```

---

## Database Schema (SQLite)

Uses `better-sqlite3` for fast, synchronous operations.

```sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,          -- GUID or hashed repo path
    repo_name TEXT NOT NULL,
    absolute_path TEXT NOT NULL UNIQUE,
    last_scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    has_uncommitted_changes BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    summary TEXT,                 -- The 2-3 sentence overview
    result_json TEXT NOT NULL,    -- The full Gemini output
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects` | Scans disk, syncs DB, returns list of all projects with basic info. |
| `POST` | `/api/projects/:id/analyze` | Triggers a fresh Gemini analysis for a specific repo. |
| `GET` | `/api/projects/:id` | Returns the detailed project info and the *latest* analysis. |
| `GET` | `/api/projects/:id/history` | Returns historical analyses to view project progression. |

---

## Frontend UI / UX

### 1. Main Dashboard View
- **Global Search/Filter:** Search by repo name or filter by status (`active`, `stalled`, `completed`).
- **Project Grid:** Displays lightweight cards for every repo.
- **Card Content:** Repo Name, Status Badge, Last Analyzed Date, Resumability Score (e.g., 🟢 8/10), and a 1-sentence snippet of the summary.
- **Action:** Clicking a card opens the Detail Modal/View.

### 2. Project Detail View
- **Header:** Repo Name, Last Scanned, path copy button.
- **Action Bar:** "Re-Analyze Now" button (shows spinner while waiting for Gemini).
- **Progress Ring:** Visual representation of `completion_percentage`.
- **Status Sections:**
  - 🟢 **Completed:** Bulleted list.
  - 🟡 **In Progress / Next Step:** Highlighted box with `next_suggested_step`.
  - 🔴 **Stalled:** Things that were dropped.
- **Metadata:** Resumability score and last activity date.

---

## Implementation Phases

### Phase 1: Backend Foundation (ETA: 1-2 Hours)
1. Setup Node.js Express server.
2. Implement SQLite DB and basic schema.
3. Build the local directory scanner (`fs`/`path`) to find `.git` repos in `REPOS_PATH`.
4. Create the GET `/api/projects` endpoint.

### Phase 2: Data Gathering Services (ETA: 2-3 Hours)
1. Integrate `simple-git` to extract the last N commits and git status for a given path.
2. Build the `chatlog.js` parser to safely read and extract plain text from Antigravity's JSON/markdown logs inside `brain/`.
3. Combine both data sources into a single large string/object.

### Phase 3: AI Integration (ETA: 2 Hours)
1. Setup Google Gen SDK.
2. Write the system prompt and integrate `gemini-2.5-flash`.
3. Build the POST `/api/projects/:id/analyze` endpoint.
4. Store the resulting JSON in the `analyses` table.

### Phase 4: Frontend Development (ETA: 3-4 Hours)
1. Scaffold React + Vite + Tailwind.
2. Build the Dashboard Grid view fetching from `GET /api/projects`.
3. Build the Project Detail view.
4. Hook up the "Analyze" button to show loading states and update the UI.

---

## Edge Cases to Handle

1. **Massive Repositories / Token Limits:** Some repos have thousands of commits. The `git.js` service must heavily prune data (e.g., only send the last 20-30 commits, omit huge diffs like minified files or `node_modules`).
2. **Missing Antigravity Logs:** The AI must degrade gracefully if a project has never been worked on via the AI assistant. It should still analyze based on Git history alone.
3. **Uncommitted Work:** If a developer has massive uncommitted changes, they won't be in the git log. The scanner should check `git status` and feed raw `git diff` of uncommitted files to the AI just in case.
4. **Rate Limiting:** Protect the AI API by preventing users from clicking "Analyze" on 50 repos simultaneously (implement a queue or simple disable state).
5. **Corrupt Chat Logs:** File reading in `CHAT_HISTORY_PATH` must be wrapped in `try/catch` as external tools might be actively writing to those files.

---

## Future Expansions

- **Auto-Analyze on File Change:** Watch the `REPOS_PATH` and silently queue analyses in the background when active work stops.
- **Timeline Graph:** Render a burnout or activity chart across all repositories.
- **Documentation Generation:** Automatically click a button to generate a `README.md` or `HANDOVER.md` based on the latest analysis.
- **Cross-Project Search:** Ask a chatbot, "Which project was I using Tailwind and Supabase in?" and have it search the SQLite database.

---

## Phase 5: Nvidia AI Service
**Goal:** Integrate the Nvidia NIM API to generate structured summaries.
- [x] Create `server/services/nvidia.js`.
- [x] Initialize the `openai` client using the API key.
- [x] Define the exact `System Prompt` detailed in `plan.md` to force a specific structured JSON output.
- [x] Write the `analyzeProject(gitContext, chatContext)` function:
    - [x] Combine Git and Chat contexts.
    - [x] Send request to Nvidia NIM.
    - [x] Attempt to parse the resulting text string as `JSON.parse()`.

## Phase 6: API Routes & Orchestration
- [x] Pass context to `nvidia.js`.
- **Cross-Project Search:** Ask a chatbot, "Which project was I using Tailwind and Supabase in?" and have it search the SQLite database.
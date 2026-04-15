# devdash — Project Analyzer Dashboard

A local-first developer dashboard that analyzes your `git` history and AI chat logs (Antigravity) using Nvidia NIM (AI) to generate project summaries, progress reports, and next steps.

## Prerequisites

- **Node.js**: (v18+ recommended)
- **Nvidia API Key**: [Get one here](https://build.nvidia.com/)
- **Antigravity AI**: (Optional) For chat log context.

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd project-dashboard
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    cd client
    npm install
    cd ..
    ```

```bash
npm run dev
```

This concurrently starts:
- **Express backend** at `http://localhost:3001`
- **Vite dev server** at `http://localhost:5173`

Open your browser at **http://localhost:5173**.

## How it Works

1.  **Scanning**: The backend scans your `REPOS_PATH` for folders with a `.git` directory.
2.  **Extraction**: It gathers recent commit messages, status, and uncommitted diffs via `simple-git`.
3.  **Chat Logs**: Matches the repo name against Antigravity session metadata to add AI chat context.
4.  **AI Analysis**: Sends the combined context to the Nvidia NIM API with a strict structured JSON prompt.
5.  **Caching**: Results are stored in a local SQLite database (`server/db/devdash.db`), so re-opening is instant.

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | Scan disk and return all projects |
| `GET` | `/api/projects/:id` | Get project + latest cached analysis |
| `POST` | `/api/projects/:id/analyze` | Trigger a fresh AI analysis |
| `GET` | `/api/health` | Server health check |

## Tech Stack

- **Backend**: Node.js, Express 5, SQLite (`better-sqlite3`), `simple-git`, `openai` (Nvidia NIM)
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide Icons

## Troubleshooting

**Dashboard shows no repos**
→ Verify `REPOS_PATH` in `.env` points to the correct folder and its subdirectories contain `.git` directories.

**"Analysis failed: AI returned malformed JSON"**
→ The AI occasionally mis-formats output. Click Re-Analyze to retry.

**No chat context included in analysis**
→ The repo folder name must appear in at least one Antigravity session artifact summary in `CHAT_HISTORY_PATH`.

**"Failed to load projects. Is the server running?"**
→ Run `npm run dev` from the root directory, not inside the `client/` folder.

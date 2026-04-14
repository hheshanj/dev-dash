# devdash — Project Analyzer Dashboard

A local-first developer dashboard that analyzes your `git` history and AI chat logs (Antigravity) using Gemini AI to generate project summaries, progress reports, and next steps.

## Prerequisites

- **Node.js**: (v18+ recommended)
- **Google Gemini API Key**: [Get one here](https://aistudio.google.com/app/apikey)
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

3.  **Configure environment variables**:
    Copy `.env.example` to `.env` in the root directory:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and provide your configuration:
    - `GEMINI_API_KEY`: Your Google Gemini API key.
    - `PORT`: Server port (default: 3001).
    - `REPOS_PATH`: Absolute path to the folder containing your local repositories.
    - `CHAT_HISTORY_PATH`: Absolute path to Antigravity's chat history (e.g., `C:\Users\<User>\.gemini\antigravity\brain`).

## Running the Application

In the root directory, run:

```bash
npm run server
```

In another terminal (or using `concurrently` if configured):

```bash
cd client
npm run dev
```

Open your browser at `http://localhost:5173`.

## How it Works

1.  **Scanning**: The backend scans your `REPOS_PATH` for folders with a `.git` directory.
2.  **Extraction**: It gathers recent commit messages, status, and uncommitted diffs.
3.  **Chat Logs**: If configured, it matches the repo name against Antigravity's chat logs to add extra context.
4.  **AI Analysis**: Sends the combined context to Gemini Flash with a structured system prompt.
5.  **Caching**: Results are stored in a local SQLite database (`server/db/devdash.db`).

## Tech Stack

- **Backend**: Node.js, Express, SQLite (`better-sqlite3`), `simple-git`, `@google/generative-ai`.
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons.

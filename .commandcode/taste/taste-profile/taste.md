# Taste Profile
- Prefers planning before implementation — explicitly says "lets plan to make it functional now" and expects plan mode to be entered before exploration or writes. Confidence: 0.95
- Wants full-stack functional implementations, not demo-ready or placeholder work — provided real backend credentials and expects dead controls to be wired, real backends connected, and data persisted. Confidence: 0.9
- Adopted Appwrite as the backend (DB + Storage + Auth) — provided project ID, endpoint, secret key, and master key for a full Appwrite integration. Confidence: 0.9
- Uses `.env.local` for environment variables (credentials for DeepSeek API key, Appwrite project ID, endpoint, and secret key). Confidence: 0.85
- Next.js + TypeScript + Appwrite + DeepSeek stack. Confidence: 0.9
- Direct, task-oriented — provides credentials in a compact key-value format and gives concise instructions. Confidence: 0.8
- Keeps project documentation (README.md, AGENTS.md) up to date with the actual state of the codebase — explicitly asks for docs to be refreshed after implementation milestones. Confidence: 0.85
- Delivers work in phased milestones with explicit stopping points — completes a phase, pauses, then decides next steps (update docs, push, continue). Confidence: 0.75
- Pushes completed, tested work to the remote repository — prefers commits to land on remote after each milestone rather than staying local. Confidence: 0.8

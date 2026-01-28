# embedded-gen

This repo is bootstrapped with the `cdx-logics-kit` under `logics/skills/` (git submodule).

## POC1 — Strudel web prototype (local)

This repo includes a local-only web prototype under `poc1/` (Vite + React + `@strudel/web`) that:
- Calls Ollama locally to generate Strudel code.
- Plays the generated Strudel code in the browser (WebAudio).

### Ollama setup (Mac)

```bash
brew install ollama
brew services start ollama
ollama pull qwen3
curl http://localhost:11434/api/version
```

### Run

```bash
cd poc1
cp .env.example .env.local
npm install
npm run dev
```

Notes:
- Configure your local Ollama URL/model in `poc1/.env.local` (`VITE_OLLAMA_HOST`, `VITE_OLLAMA_MODEL`). If you use an auth header, set `VITE_OLLAMA_API_KEY`.
- The dev server proxies `/ollama/*` → your `VITE_OLLAMA_HOST` to avoid CORS during local prototyping.
- `VITE_OLLAMA_API_KEY` is optional; if you set it, it will be bundled into the frontend build (use only for local experimentation).

## POC2 — Prompt → response (local)

Minimal local-only UI under `poc2/` that sends a prompt to Ollama (`qwen3`) and renders the response as Markdown (no Strudel integration yet).

Note: `poc2/` is now considered frozen; implement follow-up iterations in `poc3/`.

```bash
cd poc2
cp .env.example .env.local
npm install
npm run dev
```

## POC3 — Prompt → response (local, active iteration)

`poc3/` starts as a baseline copy of `poc2/` and is the place for further prototype changes.

```bash
cd poc3
cp .env.example .env.local
npm install
npm run dev
```

## Setup

```bash
git submodule update --init --recursive
python3 logics/skills/logics-bootstrapper/scripts/logics_bootstrap.py
```

## Usage

Create docs (auto-incremented IDs):

```bash
python3 logics/skills/logics-flow-manager/scripts/logics_flow.py new request --title "My first need"
python3 logics/skills/logics-flow-manager/scripts/logics_flow.py new backlog --title "My first need"
python3 logics/skills/logics-flow-manager/scripts/logics_flow.py new task --title "Implement my first need"
```

Lint Logics docs:

```bash
python3 logics/skills/logics-doc-linter/scripts/logics_lint.py
```

## Update the kit

```bash
git submodule update --remote --merge logics/skills
```

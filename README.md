# strudel-gen

This repo is bootstrapped with the `cdx-logics-kit` under `logics/skills/` (git submodule).

## Web prototype (local)

This repo includes a local-only web prototype under `web/` (Vite + React + `@strudel/web`) that:
- Calls Ollama locally to generate Strudel code.
- Plays the generated Strudel code in the browser (WebAudio).

### Ollama setup (Mac)

```bash
brew install ollama
brew services start ollama
ollama pull qwen2.5:1.5b
curl http://localhost:11434/api/version
```

### Run

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Notes:
- Configure your local Ollama URL/model in `web/.env.local` (`VITE_OLLAMA_HOST`, `VITE_OLLAMA_MODEL`). If you use an auth header, set `VITE_OLLAMA_API_KEY`.
- The dev server proxies `/ollama/*` → your `VITE_OLLAMA_HOST` to avoid CORS during local prototyping.
- `VITE_OLLAMA_API_KEY` is optional; if you set it, it will be bundled into the frontend build (use only for local experimentation).

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

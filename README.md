# strudel-gen

This repo is bootstrapped with the `cdx-logics-kit` under `logics/skills/` (git submodule).

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

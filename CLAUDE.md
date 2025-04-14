# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test/Lint Commands

- Install dependencies: `pip install -r requirements.txt` (requires ../recipe-executor to exist)
- Run backend server: `uvicorn app.main:app --reload --port 8800`
- Frontend development: `cd frontend && pnpm run dev` (must run backend first)
- Build frontend: `cd frontend && pnpm run build`
- TypeScript checks: `cd frontend && pnpm run tsc`
- ESLint checks: `cd frontend && npx eslint src`

## Code Style Guidelines

- Use Python type hints consistently including for optional parameters
- Import statements at top of files, organized by standard lib, third-party, local
- Use descriptive variable/function names (e.g., `get_recipe` not `gr`)
- Initialize variables outside code blocks before use
- Error handling should use try/except with specific exception types
- All code must work with Python 3.11+
- Use Pydantic for data validation and models
- TypeScript interfaces should match Python Pydantic models
- Follow strict TypeScript rules (noUnusedLocals, noUnusedParameters)
- React components should use functional style with hooks

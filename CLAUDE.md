# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GDPValAgents is an experimental project for creating AI agents capable of carrying out tasks with economic value, inspired by OpenAI's GDPval research. The project focuses on logistics and customer service domains and maintains only core agent logic (no fullstack UI) to enable easy porting to other projects.

## Dual-Language Architecture

This repository uses **both TypeScript and Python** for agent development:

- **TypeScript**: Uses Vercel AI SDK (`ai` package) with OpenAI models for agent implementations
- **Python**: Uses Anthropic and OpenAI SDKs for agent experiments, primarily in Jupyter notebooks

Both stacks are independent and experimental - there is no shared runtime or integration between them.

## Development Commands

### TypeScript

```bash
# Run the main TypeScript agent
npm run start

# Install dependencies
npm install
```

The TypeScript entry point is `index.ts`, which uses `tsx` for execution with ES modules.

### Python

```bash
# Run Python scripts
python main.py

# Install dependencies (using uv package manager)
uv pip install -e .

# For Jupyter notebook development
jupyter notebook notebooks/courier-agent.ipynb
```

Python uses `uv` for package management (see `uv.lock` and `pyproject.toml`). Requires Python >= 3.13.

## Project Structure

```
index.ts           # Main TypeScript agent entry point (weather agent example)
main.py            # Python entry point (minimal)
lib/agents.ts      # API route-style agent implementation (not currently used in index.ts)
notebooks/         # Jupyter notebooks for Python-based agent experiments
  courier-agent.ipynb  # Courier/logistics agent experiments
```

## Agent Implementation Patterns

### TypeScript (Vercel AI SDK)

Agents are built using the `Experimental_Agent` class from the `ai` package:

```typescript
import { Experimental_Agent as Agent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
```

Key patterns:
- Tools defined with Zod schemas for input validation
- Use `stepCountIs()` to limit agent execution steps
- Agent results include both `.text` (final answer) and `.steps` (execution trace)
- Sample implementation in `index.ts` demonstrates weather lookup with temperature conversion

### Python (Anthropic/OpenAI)

Python agents are developed primarily in Jupyter notebooks using Anthropic and OpenAI SDKs directly. See `notebooks/courier-agent.ipynb` for courier/logistics experiments.

## Environment Setup

Both TypeScript and Python require API keys in a `.env` file:

```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here  # For Python agents
```

The `.env` file is gitignored.

## Notes on Current State

- TypeScript config uses ES2022 target with ESNext modules
- No test infrastructure currently configured (`npm test` will error)
- `lib/agents.ts` contains an API route pattern (expects Next.js-style Request/Response) but is not integrated with the main entry point
- Project is in experimental/prototype phase - expect incomplete implementations

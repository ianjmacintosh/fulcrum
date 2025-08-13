# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fulcrum is a job search tracking application built with React and TanStack Start. It helps job seekers track applications, job boards, resumes, and conversion rates throughout their job search process.

The application features:
- **Dashboard**: Overview metrics including conversion rates and job search progress
- **Job Boards**: Track different job boards and their effectiveness
- **Applications**: Manage job applications and their status progression
- **Resumes**: Track different resume versions and their performance
- **Settings**: User preferences and auto-complete configuration

## Development Commands

```bash
# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build
```

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Router**: TanStack Router with file-based routing
- **Build Tool**: Vite 6 with React plugin
- **Server**: TanStack Start for full-stack capabilities

## Code Standards and Conventions

* Modules must always be managed using ES module syntax (`import`) and never using CommonJS (`require`)
* Presume the dev server is already running locally on port 3000 -- only start the dev server if you've already tried to reach it and believe it's not running

## Architecture

### Routing Structure
- File-based routing using TanStack Router
- Routes are defined in `src/routes/` directory
- Route tree is auto-generated in `src/routeTree.gen.ts`
- Root layout is defined in `src/routes/__root.tsx`

### Key Files
- `src/router.tsx`: Router configuration with scroll restoration
- `src/routes/__root.tsx`: Root layout component with HTML structure
- `vite.config.ts`: Vite configuration with TanStack Start plugin

### Server Functions
The application uses TanStack Start's server functions for backend functionality:
- Server functions are defined using `createServerFn()`
- Support both GET and POST methods with validation
- Handle file system operations and data persistence

### Development Setup
- TypeScript configuration uses strict null checks
- Module resolution set to "Bundler" for modern bundling
- TSConfig paths plugin enabled for path mapping
- Development server runs on port 3000 with host binding for containers
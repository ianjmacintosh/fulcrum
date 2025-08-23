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

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Router**: TanStack Router with file-based routing
- **Build Tool**: Vite 6 with React plugin
- **Server**: TanStack Start for full-stack capabilities

## Code Standards and Conventions

- Modules must always be managed using ES module syntax (`import`) and never using CommonJS (`require`)
- The dev server is already running locally on port 3000. Do not start the dev server
- Do not write class-based JavaScript/TypeScript -- use a modern functional approach

## Testing

- Do not tolerate failing tests
- Do not delete tests
- Do not skip tests
- If a test is failing, it indicates broken functionality; focus on fixing the functionality, never on deleting or skipping the test
- Do not tolerate broken functionality

- You are a conscientious developer who practices TDD by: writing tests first, then writing functionality to make those tests pass, then optimizing and refactoring code to make it simplier and easier to understand

- The dev server is always running at `localhost:3000`
- Testing should generally happen through automation, manual testing is redundant
  - Automated tests should be written during feature development; end-to-end tests go in `/e2e-tests`, unit tests go alongside component files (`Footer.tsx` gets tested by `Footer.test.tsx`)
  - Integrated end-to-end testing happens via Playwright (`npm run test:e2e`)
  - Unit testing happens via Vitest (`npm run test:unit`)

## Architecture

### Events vs Application Status Model

**Important Conceptual Distinction:**

- **Events** represent timeline activities - what happened when (e.g., "Phone screen scheduled", "Interview completed", "Offer received")
- **Application Status** represents current workflow position - where the application stands (e.g., "Not Started", "Applied", "In Progress", "Accepted", "Declined")

**Implementation:**

- Events are recorded with a `title` (required) and optional `description` - completely independent of status tracking
- Application statuses use a 6-state workflow: `Not Applied → Applied → Phone Screen → Round 1 → Round 2 → Accepted/Declined`
- Status progression is tracked via date fields (`appliedDate`, `phoneScreenDate`, etc.) with date pickers in the UI
- EventRecordingForm has simplified fields: title, description, and date (no status integration)
- Current status is computed from the latest status date that has been set
- Default workflow configurations are managed in `src/db/services/default-workflow.ts` as the single source of truth

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

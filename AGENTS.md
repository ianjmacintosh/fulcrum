# AGENTS.md - Fulcrum Development Guidelines

## Build/Lint/Test Commands

- **Build**: `npm run build` (Vite build)
- **Dev server**: `npm run dev` (already running on port 3000)
- **Lint**: `npm run lint` / `npm run lint:fix`
- **Format**: `npm run format` / `npm run format:check`
- **Type check**: `npm run typecheck`
- **Unit tests**: `npm run test:unit` (Vitest)
- **E2E tests**: `npm run test:e2e` (Playwright)
- **Single test**: `npm run test:unit -- src/components/Component.test.tsx`
- **Static checks**: `npm run static` (format + lint + typecheck)

## Code Style Guidelines

- **Imports**: ES modules only (`import`), never CommonJS (`require`)
- **Components**: Functional components with hooks, no classes
- **Types**: Strict TypeScript with `strictNullChecks: true`
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error handling**: Try/catch with proper error types, console.error for debugging
- **Validation**: Client-side validation before API calls
- **State**: useState with proper typing, avoid any types except in DB operations
- **Testing**: Vitest for unit tests, Playwright for E2E, tests alongside components
- **Architecture**: Events vs status separation, TanStack Router file-based routing

## Development Workflow

- Write tests first (TDD), then implement functionality
- Never delete/skip failing tests - fix the underlying issue
- Run static checks before committing
- Use functional programming patterns
- Follow existing patterns in codebase for consistency

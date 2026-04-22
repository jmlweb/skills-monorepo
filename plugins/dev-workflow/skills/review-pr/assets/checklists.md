# Review Checklists

Reference checklists that specialized agents should apply during review.

## Code Quality
- Project conventions (AGENTS.md, CLAUDE.md), named exports, functional approach
- TypeScript strict, no `any`, proper error handling, no console.log in prod
- Meaningful names, no magic numbers

## Security
- No secrets in code, input validation, auth checks
- SQL/XSS/CSRF prevention, secure dependencies

## Testing
- Unit tests for new logic, integration for APIs, E2E for critical flows
- Edge cases covered, deterministic, ≥80% coverage for new code

## Performance
- No unnecessary re-renders, optimized queries, virtualized lists
- Optimized images, acceptable bundle size, no memory leaks

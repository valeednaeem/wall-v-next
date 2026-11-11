# Implement Command

Implement a new feature or change in the Wall-V codebase.

## Usage

When invoked, follow this sequence:

1. **Load context** — Read `wall-v-context` skill for architectural rules
2. **Read existing code** — Examine target files and neighbors before writing
3. **Plan** — For complex changes, create a todo list with steps
4. **Implement** — Write code following Wall-V conventions
5. **Verify** — Run `npm run lint` and `npx tsc --noEmit`
6. **Report** — Summarize what was changed and verification results

## Rules

- Follow existing patterns — check `src/lib/`, `src/components/`, `src/app/api/` for similar code
- Path alias: `@/*` → `./src/*`
- Auth: Dashboard uses NextAuth v5. API routes use `getAuthUser()`.
- Validation: Zod schemas in `src/lib/validations/`
- Never place API keys in UI components
- Never commit secrets
- Both lint and typecheck must pass

## Output

```
Files changed:
- path/to/file.ts — [what changed]

Verification:
- npm run lint: [pass/fail]
- npx tsc --noEmit: [pass/fail]
```

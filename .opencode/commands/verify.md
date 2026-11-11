# Verify Command

Verify that code changes compile, pass lint, and work correctly.

## Usage

When invoked, follow this sequence:

1. **Run lint** — `npm run lint`
2. **Run typecheck** — `npx tsc --noEmit`
3. **Check build** — `npm run build` (if requested or critical change)
4. **Report** — Summarize results

## Rules

- Both lint and typecheck must pass
- If build fails, identify the failing file and line
- If errors are unrelated to the change, note them but don't block

## Output

```
## Verification Results

| Check | Status |
|-------|--------|
| Lint | Pass/Fail |
| TypeCheck | Pass/Fail |
| Build | Pass/Fail (if run) |

## Errors (if any)
[file:line — error description]
```

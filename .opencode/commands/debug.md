# Debug Command

Find the root cause of a bug or error in the Wall-V codebase.

## Usage

When invoked, follow this sequence:

1. **Load context** — Read `wall-v-context` skill for architectural rules
2. **Read the error** — Parse error messages, stack traces, logs carefully
3. **Reproduce** — Identify exact steps to trigger the issue
4. **Trace** — Follow data flow from input to failure point
5. **Hypothesize** — Form single hypothesis about root cause
6. **Test** — Make smallest possible change to verify
7. **Fix** — Implement fix addressing root cause (not symptom)
8. **Verify** — Run `npm run lint` and `npx tsc --noEmit`

## Rules

- NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
- If 3+ fixes fail, STOP and question the architecture
- Never propose fixes without understanding the data flow
- One variable at a time when testing hypotheses

## Output

```
Root Cause: [what is actually broken and why]
Evidence: [how we know this is the root cause]
Fix: [the specific change to make]
Verification: [how to confirm the fix works]
```

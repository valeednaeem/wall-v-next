# Review Command

Review code for quality, security, and architectural soundness.

## Usage

When invoked, follow this sequence:

1. **Load context** — Read `wall-v-context` skill for architectural rules
2. **Read the code** — Examine the files being reviewed
3. **Check quality** — Code style, naming, patterns, duplication
4. **Check security** — Auth, validation, data exposure, secrets
5. **Check architecture** — Does it follow Wall-V patterns? Is it modular?
6. **Check consistency** — Model ↔ Validation ↔ Form ↔ API ↔ Types aligned?
7. **Report** — Provide findings with severity and file:line references

## Review Checklist

- [ ] Follows existing patterns (no new libraries without approval)
- [ ] Auth check present on protected routes
- [ ] Input validated with Zod
- [ ] No secrets in client-side code
- [ ] Error handling present
- [ ] TypeScript types correct
- [ ] No duplicate systems created
- [ ] Lint passes
- [ ] Typecheck passes

## Output

```
## Quality
[Code quality findings]

## Security
[Security findings with file:line]

## Architecture
[Architectural concerns]

## Consistency
[Layer alignment issues]

## Recommendation
Ship / Fix before merge / Needs discussion
```

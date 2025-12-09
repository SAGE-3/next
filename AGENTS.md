# AGENTS.md

This file defines rules and boundaries for automated agents (AI coding tools, bots, and CI automation) interacting with the SAGE-3 Next repository.

SAGE-3 is a real-time, collaborative visualization platform built with Electron, TypeScript, Node.js, and web technologies. The AI backend services are built with Python and FastAPI.

---

## 1. Project Overview

This repository contains the next-generation SAGE-3 client and supporting services for large-scale collaborative visualization, display walls, and distributed interaction.

The project prioritizes:

- Performance
- Determinism and synchronization
- Hardware integration
- Scientific reproducibility
- Stability across platforms (macOS, Windows, Linux)

---

## 2. Allowed Actions

Agents MAY:

- Read and analyze all source files
- Propose changes via pull requests
- Refactor code when explicitly requested
- Improve documentation and comments
- Fix clearly identified bugs
- Optimize performance when scoped and validated
- Add tests when modifying behavior

---

## 3. Restricted Actions

Agents MUST NOT:

- Push directly to protected branches (`main`, `dev`, `release`)
- Modify secrets, credentials, or `.env` files
- Change authentication, permissions, or role logic without approval
- Modify licensing files
- Add new runtime dependencies without justification
- Alter CI workflows unless explicitly requested
- Remove telemetry, logging, or safety checks

---

## 4. Required Validation Before PR

Agents MUST:

- Ensure TypeScript builds without errors
- Ensure Electron application launches without runtime failure
- Run all available tests
- Run linters and formatters if applicable
- Verify that no regressions were introduced in:
  - multi-user sync
  - rendering performance
  - input handling
  - window and scene management

---

## 5. Coding Standards

Agents MUST:

- Follow existing formatting and patterns
- Match surrounding architectural style
- Prefer explicit, readable code over abstraction
- Avoid unnecessary framework changes
- Avoid large file rewrites unless explicitly requested
- Keep diffs minimal and reviewable

---

## 6. Commit & Pull Request Rules

All automated PRs MUST include:

- A clear, descriptive title
- A concise summary of changes
- A justification for the change
- Risks or known limitations
- Reference to related issues or PRs when applicable

## 7. Security Rules

The following are treated as sensitive:

- API keys
- Session tokens
- Certificates
- Authentication logic
- User data
- Network configuration

If sensitive material is detected:

- Do NOT modify it
- Immediately report the issue instead

---

## 8. Performance & Real-Time Guarantees

Agents MUST:

- Avoid introducing blocking operations on the render thread
- Avoid unnecessary re-renders
- Avoid excessive IPC traffic
- Validate any change that affects:
  - rendering loops
  - pointer/mouse input
  - frame timing
  - synchronization state

Performance regressions are considered high severity.

---

## 9. AI-Specific Rules

AI agents MUST:

- Never hallucinate APIs or internal services
- Verify all imports exist
- Never silently change schemas or network payloads
- Never rewrite large subsystems unless explicitly authorized
- Ask for clarification on ambiguous requirements
- Avoid speculative optimizations

---

## 10. Reproducibility & Research Integrity

Agents MUST:

- Preserve deterministic behavior
- Avoid silently changing visualization outputs
- Not overwrite reference datasets or baseline results
- Label any synthetic or generated data clearly

---

## 11. Autonomy Limits

Agents are NOT authorized to:

- Perform large architectural refactors independently
- Introduce new system-wide abstractions
- Change distributed synchronization models
- Modify interaction metaphors or user workflows without guidance

When in doubt: ASK FIRST.

---

## 12. Transparency

All automated actions must be:

- Fully traceable through commits and PRs
- Clearly attributed if code is generated
- Explainable to human maintainers

---

Last updated: 2025-12-09

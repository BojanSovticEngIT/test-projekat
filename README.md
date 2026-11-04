# Nearshore Workforce Application

project-am-ns-wfm-tool

## Overview

This repository is the main codebase for a complete Nearshore Workforce platform.
The platform is being delivered in modules so each capability can be built,
tested, and demoed incrementally.

## Product Modules

1. Module 1: Skill Matrix and Competency Management
2. Module 2: Workforce Management and Resource Allocation
3. Module 3: Demand Management and Staffing Tracking
4. Module 4: Workforce Intelligence (including Search & Discovery)

## Current Status

- Module 1 is implemented in this repository.
- Module 2 is planned and documented with implementation tasks.
- Module 3 is planned as the next major expansion.
- Module 4 includes a Search & Discovery frontend demo; its standalone AI-build specification is linked below.

## Documentation Map

- Business specification: [optimal-spec.md](optimal-spec.md)
- Module 2 task plan: [docs/tasks/module-02/README.md](docs/tasks/module-02/README.md)
- Module slices (MVP scope): [docs/spec/slices](docs/spec/slices)
- API contract: [docs/api/openapi.yaml](docs/api/openapi.yaml)
- Architecture references: [docs/architecture](docs/architecture)
- AI-ready Module 4 Search & Discovery demo specification: [module-04-search-discovery-ai-spec.md](docs/spec/module-04-search-discovery-ai-spec.md)

## Repository Structure

- [backend](backend): Spring Boot backend service
- [frontend](frontend): React + Vite frontend application
- [docs](docs): specifications, architecture, and delivery plans
- [e2e](e2e): Playwright end-to-end test suite
- [scripts](scripts): local automation and run scripts

## Implementation Approach

This project follows a module-by-module delivery model:

1. Define scope in specs and task plans.
2. Implement backend and frontend increments.
3. Add automated tests (unit, integration, e2e).
4. Demo completed module outcomes before moving to the next module.

As new modules are confirmed, this README will be updated with scope,
delivery status, and links to the relevant plans.

## Development Guide

### Branching Strategy

- Use this branch flow:
	- `feature/<task-id>-<short-topic>` -> `development` -> `main`
- `development` is the default integration branch for active work.
- `main` is release-ready and updated only from `development`.
- Create feature branches from the latest `development`.

### Git Pull and Sync Rules

- Pull latest changes before starting work:

```bash
git checkout development
git pull origin development
git checkout <your-branch>
git rebase development
```

- Re-sync your branch frequently (at least daily).
- Before opening a PR, ensure your branch is up to date with `development` and conflict free.

### Commit Rules

- Keep commits small and focused on one change.
- Write clear commit messages in imperative form.
- Suggested format:

```text
type(scope): short description
```

- Examples:
	- `feat(module-2): add allocation overview endpoint`
	- `fix(frontend): handle 401 redirect in axios client`
	- `docs(readme): add development workflow guide`

### Push and Pull Request Rules

- Push only your feature branch. Do not push directly to `development` or `main`.
- Open a Pull Request for all changes.
- Merge order:
	- PR 1: `feature/<task-id>-<short-topic>` -> `development`
	- PR 2 (release/promotion): `development` -> `main`
- PR should include:
	- what changed
	- why it changed
	- how it was tested
	- related task/spec link when available

### Code Review Expectations

- At least one reviewer approval before merge.
- Address review comments with follow-up commits (avoid force-pushing after review starts unless required).
- Keep PRs reasonably small to speed up review.

### Pre-Merge Checklist

- Backend builds successfully.
- Frontend builds successfully.
- Relevant tests pass.
- No secrets or environment-specific values committed.
- Docs updated if behavior, API, or workflow changed.

### Daily Developer Flow

1. Sync `development` (`git pull`).
2. Create or update `feature/<task-id>-<short-topic>` from `development`.
3. Implement and test changes locally.
4. Commit focused changes.
5. Push feature branch and open/update PR to `development`.
6. After validation, promote `development` to `main` through a separate PR.

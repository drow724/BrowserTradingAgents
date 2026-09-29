# Feature Specification: Feature 011 — Own Office Art

**Feature Branch**: `011-own-office-art`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Replace the temporary upstream Pixel Agents sprites in the office with
replacement art with recorded provenance that is committed to the repository, so the office works
everywhere and F008-L1 can be closed. Renderer and view state unchanged apart from scene data."

## Purpose

Core question: **Can the office show the same eight working roles with the project's own art, with recorded
provenance, committed to the repository, so that the office no longer depends on a local-only copy
of upstream sprites?**

```text
today:  pinned upstream package → local copy (git- and deploy-ignored) → office   (F008-L1 OPEN)
after:  committed own art ─────────────────────────────────────────────→ office   (F008-L1 closable)
```

## Baseline

Verified at specification time (2026-09-30):

| Item | Value |
|---|---|
| Branch | `011-own-office-art`, created from `main` |
| Base | `59413a6` — merge of PR #11 (Feature 010) |
| Office | own renderer (Feature 009); layout and sprite geometry are scene data only (Feature 009 FR-027) |
| Temporary art (MD-6) | upstream sprites from the pinned package, copied before build/dev into an ignored folder; nothing is copied on the deployment platform, where the office shows "오피스를 표시할 수 없습니다" |
| Art in use | 6 character sheets (idle frame + 2 typing frames, facing down; roles 7–8 reuse sheets 1–2 with a colour shift), desk, screen off + 3 screen-on frames, whiteboard, large painting, clock, double bookshelf, large plant, small plant; wall and floor are flat colours |
| Other uses of the upstream package | none — only the art copy step |
| F008-L1 | OPEN; public deployment deferred (`PUBLIC_DEPLOYMENT_DEFERRED`) |
| Repository licence | none (no licence file; `package.json` is `private`) |
| Feature 009 FR-033 | every shipped asset's licence is recorded before it is committed or served |

## Clarifications

### Session 2026-09-30

- Q: Where does the replacement art come from? → A: A — own art authored in the repository (pixel maps kept as source and turned into image files); no download.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The office with our own art (Priority: P1)

A user opens the app and sees the fullscreen office. Eight roles sit at their desks; each role is
recognisably different from the others; a working role visibly types and its screen is on, an idle role
stands still with its screen off; the Korean dialog narration is unchanged. None of the art is the
upstream art.

**Why this priority**: It is the whole feature: the visible office must not get worse while its art
becomes redistributable.

**Independent Test**: Run a stand-in analysis in a fresh checkout that never installed or copied the
upstream art; watch the office through the run.

**Acceptance Scenarios**:

1. **Given** a fresh checkout without the upstream copy, **When** the app opens, **Then** the office is
   drawn (not "unavailable") with eight roles, desks, screens and the room decoration.
2. **Given** a run, **When** a role starts and stops working, **Then** that role switches between the
   typing and idle looks and its screen between on and off, as today.
3. **Given** the office, **When** the eight roles are compared, **Then** no two roles look identical.

---

### User Story 2 - Provenance recorded, F008-L1 closable (Priority: P1)

The maintainer can see, for every art file in the repository, where it came from and what its licence status is,
and can close F008-L1 on that record.

**Why this priority**: The licence record is what makes the art committable and a deployment possible.

**Independent Test**: Compare the list of art files served by the office with the licence record; each
file has exactly one entry.

**Acceptance Scenarios**:

1. **Given** the repository, **When** the art files are listed, **Then** each has a recorded source,
   author and licence status, and none is third-party.
2. **Given** the licence record is complete, **When** verification runs, **Then** F008-L1 is recorded
   as closed with a reference to that record.

---

### User Story 3 - Temporary copy retired (Priority: P2)

The build no longer copies upstream art, and the upstream package is no longer a project dependency.

**Why this priority**: Removes a dependency and a build step that exist only for the temporary art;
not needed for the office to look right.

**Independent Test**: Install, build and open the office with the upstream package absent.

**Acceptance Scenarios**:

1. **Given** the upstream package is not installed, **When** the project is installed, built and run,
   **Then** it succeeds and the office is drawn.

### Edge Cases

- An art file fails to load: the office shows "오피스를 표시할 수 없습니다", the text status and runs
  are unaffected (Feature 009 FR-029, unchanged).
- A stale ignored copy of the upstream art still sits in a developer's checkout: the office never uses
  it.
- The replacement art has a different frame size or frame count: only scene data changes, not the
  renderer (Feature 009 FR-027).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The office MUST be drawn only from replacement art; no upstream Pixel Agents art file may
  be served, committed or referenced.
- **FR-002**: The replacement art MUST cover everything the office draws today: at least one character
  look per role with an idle frame and at least two typing frames facing the viewer; a desk; a screen
  with an off state and at least one on state; and the room decoration (six items, or a documented
  replacement set of similar size).
- **FR-003**: The eight roles MUST remain distinguishable from each other at the office's display size.
- **FR-004**: The replacement art MUST be committed to the repository and served by the application
  itself, including on the deployment platform.
- **FR-005**: Every committed art file MUST have a recorded source, author and licence status (Feature
  009 FR-033). The repository has no licence file today; choosing one for the repository or the art is a
  maintainer decision outside this Feature, and the record states the status as it is.
- **FR-006**: The art MUST be the project's own work, authored in the repository: each image has a
  human-readable source kept next to it, from which the image file is reproducibly generated. Its
  record states "own work, authored in this repository"; no third-party art file is downloaded or used.
- **FR-007**: The renderer, the Feature 008 view state and the dialog narration MUST stay unchanged;
  only scene data (file locations, frame geometry, layout numbers, colours) and the art files may change.
- **FR-008**: The temporary copy step and the upstream package dependency MUST be removed once nothing
  uses them (US3).
- **FR-009**: The art failure behaviour of Feature 009 (FR-029) MUST be preserved.
- **FR-010**: F008-L1 MUST be recorded as closed only after FR-005 holds for every file; public
  deployment itself stays a separate maintainer decision.

### Key Entities

- **Art file**: an image the office draws; its role (character, furniture, decoration), frame layout.
- **Licence record entry**: one per art file — path, source, author, licence, date recorded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a checkout without the upstream package, the office is drawn in 100% of page loads
  across the existing office checks (none show "unavailable").
- **SC-002**: 0 upstream art files are referenced, served or committed; 100% of served art files have
  a licence record entry.
- **SC-003**: All existing office, accessibility and view-overhead checks pass unchanged, apart from
  expected paths and numbers; the view's main-thread overhead stays within the Feature 009 budget.
- **SC-004**: The maintainer, looking at the office during a run, can tell all eight roles apart and
  can tell working from idle roles (manual check).
- **SC-005**: The renderer's code and the view state are unchanged (diff limited to scene data, art
  files, the licence record, the build scripts and the dependency list).

## Assumptions

- Pixel scale stays: a small world scaled up with square pixels; characters about 16×32 world pixels,
  as today. A different size is allowed if only scene data changes.
- Wall and floor stay flat colours; tiles are not required.
- Roles 7–8 may keep the colour-shift rule, or get their own looks; either satisfies FR-003 if they
  stay distinguishable.
- Art quality is judged by the maintainer (SC-004); no external review.
- No constitution change is needed: the art is a presentation asset, not data acquisition (IX) or a
  core change (V).

## Out of Scope

- New animations or states beyond idle/typing and screen on/off; walking, facing changes.
- Layout or UI redesign.
- Public deployment (a separate maintainer decision after F008-L1 closes).
- The Effectiveness Benchmark (moves to Feature 012).

## Roadmap context

Feature 009 MD-6 planned this: use the upstream art temporarily, then replace only the assets once the
own renderer works. Feature 010 is merged; its native measurement (T041) is still pending and is
unaffected by this Feature.

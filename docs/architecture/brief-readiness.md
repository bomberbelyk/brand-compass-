# Brief Readiness Criteria

Brief readiness is the product's decision model for when a project request is clear enough to generate useful documents.

The goal is not to make every area perfect. The goal is to know whether the brief is good enough for a contractor to estimate, start, and accept the work without relying on guesswork.

## Readiness Levels

## Level 0. Raw Request

The request is mostly a desire or idea.

Signals:

- goal is vague
- audience is unclear
- scope is not defined
- success criteria are missing
- subjective words are unexplained

Recommended state:

- keep interviewing

## Level 1. Directional Brief

The project direction is understandable, but important decisions are still missing.

Signals:

- project type is known
- initial goal is understandable
- some audience or context is described
- major unknowns remain
- contradictions may exist but are not resolved

Recommended state:

- allow a short internal summary
- do not generate final contractor-facing documents yet

## Level 2. Working Brief

The brief is usable for a discovery call or initial estimate.

Signals:

- goal is clear enough
- audience is at least partially defined
- desired outcome is described
- core scope is outlined
- major constraints are known or marked as missing
- key vague terms are unpacked
- major contradictions are named

Recommended state:

- generate Client Brief
- generate Executive Summary
- mark unresolved areas clearly

## Level 3. Production Brief

The brief is ready for a contractor to estimate and start work with limited follow-up.

Signals:

- goal is clear
- audience is clear
- business context is clear enough
- scope and out-of-scope are defined
- required deliverables are listed
- timeline is known or explicitly undecided
- budget is known or explicitly undecided
- stakeholders and approvers are known
- acceptance criteria are defined
- major risks are named
- contradictions are resolved or converted into priorities

Recommended state:

- generate full document set
- allow PDF and Markdown export

## Level 4. Signed-Off Brief

The brief can be used as an agreement baseline.

Signals:

- all Level 3 criteria are met
- revision rules are defined
- final approver is named
- change request boundaries are defined
- open questions are either answered or accepted as risks

Recommended state:

- use as project baseline
- enable client approval in version 2

## Required Areas For MVP

A brief should not be considered ready for full generation unless these areas are at least `partial`:

- goal
- audience
- desired result
- scope
- constraints
- timeline
- stakeholders
- acceptance criteria

These areas may be `weak` if explicitly marked as open questions:

- budget
- references
- technical requirements
- risks

These areas should never stay `missing` at final generation:

- goal
- scope
- acceptance criteria

## Stop Criteria For The Interview

The AI interview may stop when all of the following are true:

- the user has described what they want to create
- the user has explained who the result is for
- the user has named what should change after the project
- the user has described the minimum expected deliverables
- the user has stated what is outside the current task
- the user has named who approves the result
- the user has described how they will judge success
- all high-severity contradictions are resolved or explicitly accepted as tradeoffs
- remaining missing information is listed as open questions

## Red Flags That Block Readiness

The brief should not be marked as ready if any of these are true:

- project goal is still only emotional language
- audience is "everyone" with no prioritization
- scope has no boundaries
- no acceptance criteria exist
- the final approver is unknown
- the user wants conflicting priorities but refuses to choose
- key deliverables are not named
- the brief depends on references that were mentioned but not interpreted

## Maturity Score Interpretation

The Brief Maturity Score should support the readiness level, not replace it.

Suggested score bands:

- 0-30: Raw Request
- 31-55: Directional Brief
- 56-75: Working Brief
- 76-90: Production Brief
- 91-100: Signed-Off Brief

The score can be high only if required areas are sufficiently clear. A high score should be impossible when goal, scope, or acceptance criteria are missing.

## Final Generation Rule

Generated documents must not hide uncertainty.

If information is unknown, the document should say:

```text
To be clarified
```

If there is a contradiction, the document should say:

```text
Unresolved tension
```

If the user made an explicit tradeoff, the document should say:

```text
Priority decision
```


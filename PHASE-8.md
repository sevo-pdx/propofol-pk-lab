# Phase 8 — simultaneous model comparison

## Implemented

“Compare models” runs Eleveld, Schnider (fixed ke0 0.456) and adult Marsh + ke0 0.26 using identical applied covariates, targeting mode and target events. Each model independently computes its simulated administration through the existing educational controller. Separate aligned Cp, Ce and administration-rate plots use consistent model colors and distinct dash patterns. Each plot has its own labelled vertical scale, shared across models within that plot.

The panel shares the existing simulation clock, speed, full-course/live-window mode and timeline. Hover inspects every model at the same time; clicking seeks the shared playhead. A table shows Cp, Ce, target, current simulated mg/min (and mcg/kg/min), and cumulative administered mass through the inspected time. A second table switches between volumes/clearances and microconstants. Variant labels and model-specific notes remain explicit; no clinical ranking is implied.

Prescribed-input mode provides a distinct experiment: every model receives the identical prescribed rate, producing equal administered mass but different predicted concentrations. TCI mode instead shares targets and allows different administration profiles. The interface labels this distinction.

## Architecture

`src/ui/comparison.ts` orchestrates the existing scenario adapters with a single patient and event sequence. It returns a discriminated available/unavailable result for each model. Unsupported covariates never trigger a substitute patient, fallback model, zero-filled trajectory or silent clamp. The selected model's own validation still governs application of the patient form; other models may be unavailable individually.

`src/ui/ModelComparison.tsx` renders solved samples and parameter tables with D3. No PK equations or new fitted constants were added. Runs are memoized and recalculate only when comparison is enabled and patient, targeting mode, events or prescribed course change; playback and hover do not rerun integration. Comparison reveals the union of required patient fields even when Marsh is the selected single model. All model-specific source notes remain available.

## Verification

**77 tests pass**, strict TypeScript checks and production build pass. Five new tests cover both Cp/Ce targeting against independent standalone runs, identical and unmodified input sequences, off-grid target events, zero-target stopping, distinct administered masses, equal prescribed mass with different concentrations, explicit unavailable models without replacement data, timeline edits and rejected duplicate events.

Browser verification: all three appear at a common playhead; applying target zero updates every model immediately without forcing Ce; deleting that event restores the course. Parameter toggle works. Comparison chart seeking updates the main clock. A five-year-old hypothetical patient explicitly marks Schnider unavailable while other results remain visible. The standard adult example was restored after checking. Mobile 390 px viewport has no page-level overflow; wide tables scroll internally. No browser console errors observed. The existing on-demand p5 bundle size advisory remains.

## Assumptions and remaining uncertainties

No scientific source or PK/PD assumption changed. All [phase 7 source-audit limitations](PHASE-7.md) remain: primary-table reproductions versus outstanding original-table checks, absence of independently tabulated exact patient benchmarks for the new models, Eleveld supplementary NONMEM/year-convention audit, and unimplemented BIS. The finite-pulse controller remains an educational algorithm without hardware-rate/plasma constraints. Population model comparison is not comparative clinical validation.

Plots use the most recent solved sample at each inspection time, with no interpolation of compartment states. Cumulative mass is the solver's administered state, not a rate multiplied by the current time. Full-course mode intentionally reveals calculated future values; live mode only draws elapsed samples. Parameter tables describe the fixed applied patient, not observed/adapted data. Phase 9 BIS support has not been added.

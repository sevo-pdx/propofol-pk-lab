# Phases 2–3: React simulation and visualization

Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.

## Phase 2 — single-patient Eleveld interface

Implemented React/TypeScript/Vite on the existing engine. Patient inputs support age, model sex, height, weight, concomitant anaesthetics and explicit PMA below six months. Applying valid changes recalculates the course and resets playback; invalid entries leave the applied scenario intact. Derived BMI, FFM and model-adjustment factors are visible. References explain the population, correction and scientific limitations.

The original 33 mathematical tests pass. No PK constants changed. The page displays deterministic population predictions; the full course is computed from the same RK4 engine used by the command-line example. Parameter changes start a new experiment rather than discontinuously changing compartment volumes during a run.

## Phase 3 — charts and clock

Implemented D3 SVG Cp/Ce overlays, a simulated-rate chart, large current readouts, hover inspection, click-to-seek, a keyboard-operable time slider, play/pause/resume/reset, five-minute jumps and all requested playback speeds (0.5× to 60×). Full-course preview includes future calculated values and is explicitly labelled. Live-window mode reveals elapsed data and scrolls after 20 minutes.

Simulation and wall-clock time remain distinct. Playback uses elapsed wall time scaled by the selected speed; changing speed does not change the precomputed numerical trajectory. A hidden browser tab pauses playback. The inspector shows either volumes/clearances or derived microconstants.

## Verification

- **37 tests pass:** all 33 engine tests plus four scenario-adapter tests for exact event timing, solved-state selection, invalid inputs and clock formatting.
- Strict TypeScript checking passes; Vite production build succeeds.
- Browser checks: +5-minute seeking reproduces the reference course; play advances and pause stops; older-adult changes reset time and update parameters; microconstants and references open correctly; PMA appears for an infant age.
- Responsive inspection at desktop, 820 px and 390 px. Narrow-screen content width matches the viewport; chart axes retain readable sizes using a resize-aware viewBox.
- Development hot-reload root warning resolved by separating the App component from the application entry point.

## Assumptions and uncertainties

- This release uses **prescribed simulated input**, not a target controller. The default arbitrary experiment remains 5 mg/min for 30 minutes followed by zero input through 60 minutes. It is not an administration recommendation.
- Course samples are solved at one-second intervals; readouts use the last solved state at or before the playhead. Exact event timestamps are retained even between regular sample times.
- Existing source-audit items remain: supplementary NONMEM S2 replay and the precise year/week convention. Printed BIS inconsistencies remain unresolved. No BIS estimates are generated.
- Presets are hypothetical covariates, not clinical treatment scenarios. No new scientific parameters were added.
- Static build is available in `dist/`; hosting has not been configured or published. Fonts have system fallbacks but their preferred faces are loaded from Google Fonts.

## Next: phase 4

Implement and verify the theoretical TCI controller and editable target-event timeline before adding compartment animation and live-equation teaching views. Additional models, comparisons and BIS remain later phases in the requested sequence.

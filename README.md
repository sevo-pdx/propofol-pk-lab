# Compartment — educational propofol PK lab

**Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.**

The tested TypeScript engine now has a React/Vite interface with D3 graphs, patient controls, playback, a model inspector and source references. Phases 1–8 are implemented, including Cp/Ce targeting, editable target events and the animated compartment model. It contains no hardware interfaces, observed-data adaptation or clinical recommendations.

## Run

With Node.js 22 or newer and pnpm installed:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm demo
pnpm dev
```

Open the local address printed by `pnpm dev`. Build with `pnpm build`; publish the contents of `dist/` on any static host. Relative asset paths support subdirectory hosting. No backend is needed. `pnpm preview` serves the production build locally.

The mathematical core in `src/models/` and `src/simulation/` has no runtime dependencies and no Node or browser imports. React, D3 and browser state are isolated in `src/ui/`. Typography loads from Google Fonts with system fallbacks if unavailable.

## Architecture

| Module | Responsibility |
|---|---|
| `src/models/types.ts` | Generic model, patient, parameter, mass-state and evaluation interfaces |
| `src/models/units.ts` | Branded units, runtime validation and explicit conversions |
| `src/models/eleveld.ts` | Verified published covariate equations and arterial ke0; returns adjustment factors for a later inspector |
| `src/models/effectSite.ts` | Virtual effect-site equilibration |
| `src/simulation/equations.ts` | Compartment derivatives, directional fluxes, concentrations and microconstants |
| `src/simulation/integrator.ts` | RK4 with default one-second simulated steps and a rate-dependent stability cap |
| `src/simulation/timeline.ts` | Deterministic, timestamped simulated input; integrates exactly to event boundaries |
| `tests/oracle.ts` | Independent matrix-exponential numerical benchmark |
| `examples/sixty-minutes.ts` | Hypothetical simulation with CSV and JSON export |

The engine stores A1/A2/A3 in mg, volumes in L and time in min. Concentrations are calculated as mass/volume. The effect-site state is in mg/L and has no physical drug mass. Administered and eliminated mass are integrated alongside the physical compartments. For a run starting empty:

```text
A1 + A2 + A3 + eliminated = administered
Cp = A1/V1; C2 = A2/V2; C3 = A3/V3
dA1/dt = R − CL·Cp − Q2·(Cp−C2) − Q3·(Cp−C3)
dA2/dt = Q2·(Cp−C2)
dA3/dt = Q3·(Cp−C3)
dCe/dt = ke0·(Cp−Ce)
k10=CL/V1; k12=Q2/V1; k21=Q2/V2; k13=Q3/V1; k31=Q3/V3
```

No state is clipped to zero or forced to a target. Invalid integration states throw. 1 mg/L equals 1 mcg/mL exactly. Branded types prevent interchange of quantities at public boundaries; ODE internals use documented canonical units.

## Verification and limits

All 77 tests pass, together with strict TypeScript checking. Tests cover the corrected published reference patient, independent numerical solutions, conservation, nonnegative trajectories, equilibration, recovery, event boundaries, invalid inputs, timestep refinement and 1000× conversion mistakes. See [phase report](PHASE-1.md) for tolerances and results.

Scientific provenance is recorded in [the source register](references/REFERENCES.md). Supplementary NONMEM replay remains an explicitly documented audit item. Numerical verification is not clinical validation.

The example uses an arbitrary mathematical input of 5 mg/min for 30 simulated minutes followed by 30 minutes at zero. It demonstrates lag, redistribution and elimination. This is **not** a TCI controller or a suggested administration course. The browser now supports TCI targeting and animation; the command-line example remains the original prescribed input experiment. Live equations are available within educational mode; simultaneous model comparison is available and BIS remains for a subsequent phase. See [phases 2–3](PHASE-2-3.md) [phases 4–5](PHASE-4-5.md), and [phase 6](PHASE-6.md).

## Assumptions

- Deterministic population model: random effects and observation errors are zero.
- Arterial PK and effect-site parameters only.
- Patient parameters stay fixed for each simulated course; changing covariates requires a new run.
- PMA is required below six months; otherwise its default is explicitly reported as age + 40 weeks.
- Study age/weight bounds are application input limits, not a claim that every combination within those bounds was studied. Height must be finite and positive; no unverified height bounds are invented.
- Rate events are right-continuous, duplicate times are rejected, and the simulation has no wall-clock coupling.

## Browser architecture

`src/ui/scenario.ts` adapts the engine into a one-second sampled course. `Charts.tsx` renders D3 paths, hover inspection and seeking. `App.tsx` handles forms, playback, readouts, the inspector and references. UI components do not solve PK equations. The full-course chart previews the entire calculated experiment; the live window displays only elapsed data. Editing and applying covariates restarts the experiment.

## Targeting and compartment education

Choose Cp or Ce targeting, edit the target timeline, or apply a new target at the current simulation time while playback continues. The target curve is distinct from the solved concentrations. The controller in `src/simulation/tciController.ts` is an educational finite-pulse predictor; it does not emulate a commercial device or impose a hardware rate limit. All algorithm settings and limitations are documented in the phase report.

“Show PK/PD model” loads a p5.js animation on demand. The `compartmentView.ts` adapter reads the engine’s exact concentrations, masses and fluxes. HTML readouts remain accessible alongside the canvas. Effect-site equilibration is explicitly virtual and massless. Motion is tied to simulation time and respects reduced-motion preferences.

“Show mathematics” expands the live equations. `src/simulation/mathView.ts` derives teaching terms from the solver’s existing fluxes and derivatives; `src/ui/MathView.tsx` only formats and renders them. Select a term to highlight the corresponding pathway. Values follow the playhead, and the physical-mass balance excludes the virtual effect site.

## Administration rate equivalents

Simulated input is shown primarily in mg/min with a secondary mcg/kg/min equivalent in the current readout, chart inspection, prescribed input controls/course, compartment input readout and mathematical input term. Conversion is `mg/min × 1000 ÷ applied total body weight (kg)`. Draft patient edits do not affect the conversion until applied. Physical exchange/elimination derivatives remain in mg/min; the solver and controller are unchanged. Two additional unit tests cover the SI factor, zero rate, weight scaling and invalid inputs.

## Model selection

Choose Eleveld (default), Schnider with fixed ke0 0.456, or adult Marsh with the explicitly added ke0 0.26 pairing. Switching models preserves applied covariates and target events and resets the clock. Only mathematically used covariates are shown. See [phase 7](PHASE-7.md) for parameter provenance, numerical verification and remaining source-audit limitations. The same mg/min and mcg/kg/min equivalents, charts, targeting, animation and equations work with all three models.

## Compare models

Enable “Compare models” to overlay all three models for the same applied patient and target sequence. Shared playback, target edits, plot inspection and seeking synchronize the results. Compare Cp, Ce, simulated rate (mg/min and mcg/kg/min), cumulative administered mass and parameters. Unsupported models are explicitly marked unavailable; no covariates are substituted. Prescribed-input mode instead compares concentration responses to the same input. See [phase 8](PHASE-8.md).

### Phase 9 — optional BIS

Observed BIS now supports manual entries, pasted timestamp/value pairs, and local CSV imports with preview and validation. Observations are separate from all PK and controller calculations. No BIS remains the default. Model-predicted BIS is explicitly unavailable pending resolution of the original Eleveld PD source discrepancy; no assumed relationship is substituted. See [PHASE-9.md](PHASE-9.md) for behavior, verification and outstanding scientific uncertainty. Current automated suite: 98 passing tests.

## GitHub Pages deployment

This is a client-side static site. The repository workflow builds `dist/` and publishes it to GitHub Pages on pushes to `main`. Enable Pages with **Settings → Pages → Build and deployment → GitHub Actions** after creating the repository. The educational-use notice is part of the application; this remains a PK/PD simulation, not a dosing or pump-control tool.

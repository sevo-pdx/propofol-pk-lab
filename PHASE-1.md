# Phase 1 completion report

**Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.**

## Delivered

Generic TypeScript interfaces; unit types and conversions; three-compartment mass equations; effect-site kinetics; deterministic RK4 integration; Eleveld arterial covariates; input-event handling; 33 unit tests; reproducible 60-minute CSV/JSON output. No React or visualization work has begun.

## Checks completed

| Check | Acceptance criterion | Result |
|---|---|---|
| Strict TypeScript check | No errors; unit mismatch checked with expected compile error | Pass |
| Published reference patient | V1/V2/CL/Q3/ke0 within 1e−12; V3 within 1e−10 of reference | Pass |
| Corrected Q2 | Within 0.005 L/min of rounded 1.83 | 1.8303197125946602 L/min |
| Independent matrix exponential | A1/A2/A3/Ce within 1e−8 canonical units, five times through 60 min | Pass |
| Mass balance | Absolute error ≤1e−8 mg across adult, elderly, high-weight, child and neonatal examples | Pass |
| Nonnegativity | Every sampled state and concentration ≥0; every internal step checked | Pass |
| Effect-site equilibrium | Analytical fixed-Cp exponential within 1e−10 mg/L | Pass |
| Closed-compartment conservation | Mass within 1e−9 mg after 120 min | Pass |
| Timestep refinement | 1 s vs 0.5 s ≤1e−7; 0.5 s vs 0.25 s ≤1e−8, all state fields at every sample | Pass |
| Recovery | Cp/Ce lower after washout; long-run decay; transient post-stop Ce rise allowed | Pass |
| Event timing | Off-grid events integrated exactly; duplicates rejected | Pass |
| SI conversions | mg↔mcg and L↔mL factors 1000; mg/L↔mcg/mL factor 1 | Pass |

The published numerical reference is age 35 years, male, 170 cm, 70 kg, without concomitant anaesthetics. All other patient tests are mathematical/property tests, not claimed published validation examples. The independent matrix method checks the numerical solver, not the model's predictive accuracy in people.

## 60-minute demonstration

Arbitrary mathematical input: 5 mg/min from t=0 to t=30 min, then zero through t=60. No target controller is involved. These values are simulation inputs, not recommendations.

| Simulated min | Cp (mcg/mL) | Ce (mcg/mL) | Cumulative simulated mass (mg) | Mass remaining (mg) |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 10 | 1.242798 | 0.830263 | 50 | 32.220315 |
| 20 | 1.426667 | 1.238419 | 100 | 58.224739 |
| 30 | 1.554687 | 1.446362 | 150 | 81.475446 |
| 40 | 0.403641 | 0.744548 | 150 | 70.561724 |
| 50 | 0.287737 | 0.424778 | 150 | 64.449284 |
| 60 | 0.212017 | 0.281719 | 150 | 60.023845 |

Maximum sampled mass-balance residual: **2.9132252166164108e−12 mg**.

Full outputs: [CSV](examples/sixty-minutes.csv) and [JSON with covariates, parameters, assumptions and event history](examples/sixty-minutes.json).

## Assumptions and remaining uncertainties

1. The implementation uses the original printed arterial PK equations plus the verified corrigendum. Every used empirical coefficient has a source comment. No unverified PK constant was filled in.
2. The authors recommend their supplementary NONMEM files for implementation. Publisher retrieval did not provide S2/S4; an independent cross-check against them remains open. The implementation is therefore numerically verified and checked against the corrected reference, not an independently certified reproduction of all NONMEM outputs.
3. Years convert to weeks using 365.25/7. This is explicit and should be checked against S2, especially for neonatal examples. An exact-reference equality test for Q2 would be inappropriate because the published value is rounded.
4. The printed BIS equation and sigmoid branch labels are inconsistent. No BIS output is implemented; TODO markers preserve this source-verification requirement for phase 9.
5. Study age/weight limits are enforced, but those marginal limits do not imply validation of every age/weight/height combination. No random-effects sampling, uncertainty intervals or extrapolation claims are made.
6. The controller and clinical-style UI are intentionally outside this first deliverable. No clinical dosing or pump-control functionality exists.

## Next phase

The mathematical test gate passes. The next planned phase is the single-patient Eleveld browser simulation, retaining the documented source-audit limitations and keeping observed data distinct from population predictions. The outstanding supplementary audit must not be represented as completed.

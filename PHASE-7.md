# Phase 7 — Schnider and adult Marsh

Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.

## Delivered

Three selectable population models share the unchanged mass-based RK4 solver, finite-pulse educational controller, target timeline, chart inspection, mg/min and mcg/kg/min readouts, compartment animation and live mathematics. Eleveld remains the default. Changing model preserves applied covariates and the target sequence, resets the clock, and recalculates the entire course. This is single-model exploration; simultaneous overlays remain phase 8.

Schnider uses its volume/clearance equations and James LBM, with fixed ke0 0.456 min⁻¹. Adult Marsh uses weight-scaled V1 and published microconstants; peripheral volumes and clearances are derived to preserve those constants exactly. The selectable Marsh variant explicitly adds ke0 0.26 min⁻¹, the pairing studied by Coppens et al. It does not imply that the original Marsh PK publication supplied that PD constant.

The patient form hides unused inputs: Schnider hides drugs/PMA; Marsh uses only weight and does not calculate a placeholder LBM or PMA. The inspector distinguishes fixed, adjusted and derived parameters. Model-specific formulas and source links appear in the patient explanation and References/About panel. Invalid Schnider parameters are rejected before replacing the active simulation; adult-only scope and high-weight James limitations are explicit. No clipped LBM or substituted weight is used.

## Scientific verification and assumptions

See [the source register](references/REFERENCES.md) for full titles, authors, journals, DOIs and exact source locations:

- S1998: original Schnider PK article, Methods James equation; Table 2 identified but its image awaits direct visual cross-check.
- K2012 / P2017: primary research tables reproducing the implemented Schnider PK coefficients.
- S1999 Results: fixed ke0 0.456.
- M1991: adult-model attribution and distinction from the revised pediatric model.
- W2013 Table 1: complete adult Marsh parameter set.
- C2010 Methods: explicit Marsh + ke0 0.26 pairing.

No empirical parameter is guessed. Q2/Q3 are named consistently with this application's central-to-rapid/central-to-slow convention. Source papers that use Q1/Q2 are mapped accordingly. Printed rounded microconstants and volume/clearance coefficients are not mixed. P2017's differing ke0 entries are deliberately not used; effect-site sources are stated separately.

Both new models are deterministic population predictions; individual variability and measurement error are not simulated. Age restriction of 18+ for Schnider is an application scope choice, not a fitted parameter. Its 1998 abstract's 26–81-year range is used to label age extrapolation, without claiming other covariate combinations are supported. Marsh computes only weight effects; its name and notes make clear that this is the adult set, not a pediatric fit.

## Tests and checks

**72 automated tests pass**, with strict TypeScript checking and a successful static production build. The mathematical gate passed before model selection was connected to the interface.

New checks cover published parameter tables, the 60 kg weight from W2013 Figure 1, James equations for both sexes, Schnider age dependencies, unused covariates, Marsh linear weight scaling, invalid/extrapolated covariates, both TCI modes, nonnegativity, conservation, decay, equilibrium, timestep refinement and independent matrix-exponential solutions. Adapter tests ensure the selected model reaches both prescribed-input and TCI simulations.

Parameter/microconstant tolerance: 1e-12; synthetic patient fixtures: 1e-10; independent trajectory comparison: 1e-7; conserved mass in targeting: 1e-7 mg. Schnider's age-53/77 kg/177 cm fixture is independently calculated using rational arithmetic; it is not presented as a measured or independently tabulated published patient.

Browser checks verify both selections, clock reset and retained events, appropriate covariate fields, parameter changes, weight-adjusted rates, high-weight James explanation, rejected pediatric Schnider input, and Marsh educational view. The existing lazily loaded p5 bundle still produces a size advisory; it does not prevent the build.

## Remaining uncertainties

Independent original-source-code replay and exact tabulated patient-output benchmarks for both new models remain open audit items. Original Schnider Table 2 visual comparison and original Marsh full-table comparison remain additional source audits; complete constants have been verified in the named primary research reproductions. Existing Eleveld supplementary NONMEM/year-convention and BIS-source uncertainties remain unchanged. These tests establish implementation consistency, not clinical validation or superiority. No BIS relationship, clinical recommendation, hardware connectivity or simultaneous model comparison was added.

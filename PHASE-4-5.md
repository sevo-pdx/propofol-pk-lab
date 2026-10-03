# Phases 4–5 verification and implementation notes

Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.

## Phase 4: controller and target events

Phase 4 mathematical gate: all **46 tests pass** (33 original engine, four adapter, nine controller cases). Strict TypeScript checking passes. No pharmacokinetic parameters changed.

The controller is an explicitly documented educational finite-pulse predictor, not a reproduction of a commercial controller. Background literature distinguishes plasma and effect-site targeting: Shafer SL, Gregg KM, *Algorithms to rapidly achieve and maintain stable drug concentrations at the site of drug effect with a computer-controlled infusion pump*, *Journal of Pharmacokinetics and Biopharmaceutics* 1992;20(2):147–169, DOI 10.1007/BF01070999, [PubMed 1629794](https://pubmed.ncbi.nlm.nih.gov/1629794/). This paper is conceptual background, not a claim that its exact algorithm has been implemented.

For a fixed linear PK/effect-site system, superposition gives predicted concentration `C(t) = F(t)·state + R·G(t)`. `F` is the zero-input response from each basis state; `G` is the response to a unit-rate input lasting one control interval. All responses are integrated using the verified RK4 engine.

- Cp targeting solves `R = max(0, (target − free Cp)/unit-pulse Cp)` at the next control boundary.
- Ce targeting chooses the smallest nonnegative `(target − free Ce(t))/unit-pulse Ce(t)` over the forecast samples. This aims to keep the predicted pulse peak at the target. If residual drug alone exceeds the target, input is zero.
- Numerical choices: a 10-second control interval, 5-second forecast spacing, and a horizon of at least 20 minutes or eight effect-site time constants, whichever is longer. These are algorithm settings, not empirical pharmacological constants.
- Ce is never assigned to a target; all state changes pass through the ODE solver. There is no hypothetical negative infusion to remove drug.
- There is no hardware rate limit or imposed plasma ceiling. Very brief simulated rates and Cp overshoots can therefore be large. The UI explains this idealized behavior.
- Future target events do not influence previous controller decisions. Events split integration at their exact timestamps; the controller recalculates immediately. Updates preserve the playhead, including during playback.
- Events can be added, edited, deleted, moved by dragging or moved using the keyboard. Duplicate times are rejected explicitly. With no events the target is zero.

Tests verify convergence to Cp/Ce targets; mass conservation and nonnegative states; Cp overshoot with actual Ce lag; zero-target shutoff; step-down suspension; causal off-grid changes; halved integration steps; refined/extended forecasts; and invalid events. Target tolerance tests are numerical checks, not clinical limits. A finite sampled forecast does not guarantee a mathematically exact continuous-time peak.

Existing source uncertainties remain: independent Eleveld supplementary NONMEM replay and its precise year/week convention. No BIS relationship or additional PK model has been added.

## Phase 5: compartment animation

The p5.js canvas shows central, rapid peripheral, slow peripheral and virtual effect-site compartments. Concentration controls fill on a single shared scale; HTML cards show volumes, masses and concentrations. Net Q2/Q3 arrows reverse with redistribution. Input and elimination have separate flows. A hollow indicator on a dashed connection shows the direction of virtual equilibration; it does not depict physical drug mass transfer.

The animation consumes the same solved compartment states and directional fluxes as the simulator; it does not implement a second PK model. Particle counts and speeds are illustrative, not a dose or exact flux scale. Numerical flux values provide the quantitative encoding. Motion follows simulation time, freezes when paused and respects reduced-motion preferences. The effect-site mass and volume are explicitly not applicable.

Final gate: **53 automated tests pass**, including three animation-adapter tests and four additional TCI covariate checks (older adult, high-weight female, child and neonatal numerical examples). These checks are mathematical—not independent clinical validation. Strict TypeScript checking and production build pass. p5 is a separately loaded bundle; the main simulator does not load it until the educational view opens.

Browser checks completed: Cp mode tracks its target; add/edit/delete work; duplicate timestamps are rejected; keyboard and pointer dragging change event times; clicking a marker does not move it; applying zero during playback immediately sets simulated input to zero while Ce remains nonzero and playback continues. The canvas and quantitative readouts render correctly.

Remaining uncertainties are unchanged from phase 4. No unverified pharmacological constants, BIS relationship or new PK model was introduced. Live mathematical substitutions belong to phase 6 and are not included here.

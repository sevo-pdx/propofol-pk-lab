# Phase 6 — live mathematical teaching mode

## Implemented

Within “Show PK/PD model”, “Show mathematics” reveals all four differential equations, current numerical substitutions, directional term values and instantaneous derivatives. Incoming, outgoing, eliminated and virtual-equilibration terms have distinct colors plus explicit signs and labels. Terms are keyboard-operable buttons; selecting one highlights the corresponding input, Q2, Q3, clearance or ke0 pathway in the existing p5 diagram. All terms sharing that pathway are selected together. Hiding mathematics removes the diagram highlight.

Equations follow the simulation playhead during playback, pause and seeking. They do not follow the graph hover cursor or alter the model. The mass-balance panel demonstrates cancellation of exchange terms and excludes the massless virtual effect site. Units explicitly distinguish mg/min from µg/mL per min and explain 1 mg/L = 1 µg/mL.

## Architecture and scientific provenance

`src/simulation/mathView.ts` builds presentation data using `fluxes`, `concentrations` and `derivative` from the tested engine. It introduces no PK/PD constants, new parameters or alternative solver. `src/ui/MathView.tsx` formats these values and handles selection. The animation receives only a pathway key for highlighting.

The equations are the algebraic expansion of the existing mammillary model documented in Eleveld et al., *Pharmacokinetic–pharmacodynamic model for propofol for broad application in anaesthesia and sedation*, British Journal of Anaesthesia, 2018, 120:942–959, DOI 10.1016/j.bja.2018.01.018 (model structure p.943). Existing corrected model parameters and effect-site equilibration remain unchanged; see [source register](references/REFERENCES.md). This phase requires no additional scientific constants or external model sources.

## Verification

All **57 tests pass**, strict TypeScript checking passes, and the production build succeeds. Four new tests verify:

- Displayed signed terms sum to the exact engine derivatives; numeric factor substitutions reproduce each flux.
- Displayed slopes agree with a short RK4 advance, within 1e-4 in the corresponding derivative units.
- Q2 and Q3 transfers cancel across physical compartments; total mass derivative equals input minus elimination within 1e-12.
- Equal concentrations give zero net peripheral and effect-site derivatives even with positive directional exchange.

Browser checks verify live updates, pause, term selection and pathway labels, hide/show behavior, and readable 390 px and 1280 px layouts. The narrow layout has no horizontal overflow; no browser errors were observed. The existing on-demand p5 bundle still produces a build size advisory.

## Assumptions and remaining uncertainties

- Presentation rounds to three decimal places, using scientific notation for small nonzero values. Full-precision values determine every result; displayed rounded factors may not multiply to precisely the displayed result.
- Slopes are instantaneous derivatives at the sampled playhead state and current simulated rate, not average changes over a playback interval.
- The diagram represents net redistribution, whereas equations expand both directional exchanges. Highlighting selects the whole pathway, not an individual stream of physical particles.
- PK source uncertainties remain unchanged: independent supplementary NONMEM replay and exact source year/week convention remain open audit items. The controller remains the previously documented educational finite-pulse predictor.
- No additional models, BIS predictions, clinical recommendations or hardware interfaces are introduced.

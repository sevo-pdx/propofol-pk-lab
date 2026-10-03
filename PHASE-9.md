# Phase 9 — observed BIS delivered; predicted BIS source gate remains

The optional BIS panel defaults to No BIS. Observed data support manual entry at the running playhead or a custom elapsed time, pasted pairs, and browser-local CSV/TSV imports. Imports are previewed, validated atomically and appended. Duplicate timestamps are rejected, and individual records can be deleted. Values must be finite within the BIS index bounds 0–100; these are data-validation bounds, not clinical alarm limits.

Unconnected observations share the full-course/live time domain. Point inspection shows the corresponding simulated concentrations, administration rate (mg/min and mcg/kg/min), cumulative mass and target. Clicking a point seeks the common clock. The main chart reports the last observation with its actual timestamp, without interpolation or pretending it was measured at the playhead.

## Separation and assumptions

`src/observations/bis.ts` owns parsing and validation. React holds the observations separately; no observation enters any PK model, integrator, controller or comparison calculation. Changing applied patient covariates clears observations and pending imports. Clock resets, target edits and model changes retain observations. Hiding BIS retains records. Reloading closes the in-memory experiment; nothing is uploaded or persisted. Imports accept two columns only, with optional `time_min,bis` header and decimal minutes or mm:ss. Limits of 1 MB and 10,000 rows protect browser resources. CSV parsing intentionally excludes embedded separators/newlines and extra columns. No patient identifiers are requested.

## Scientific uncertainty — not resolved

Model-predicted BIS is selectable but explicitly unavailable, rather than generating an assumed curve. Eleveld et al. (2018), DOI 10.1016/j.bja.2018.01.018, printed BIS equation and Table 3 slope labels need reconciliation with original supplementary NONMEM S4. Publisher access remained unavailable during this audit. The CRAN `tci` Eleveld implementation uses branch assignment that differs from the printed slope labels; it is useful audit evidence, not sufficient authority to silently resolve the discrepancy. No BIS constants or formulas were added. `src/models/bisAvailability.ts` contains the explicit TODO gate. Schnider and Marsh effect-site constants are not themselves BIS response models; no borrowed PD curve is used.

Audit pointers:
- Eleveld, Colin, Absalom & Struys. Pharmacokinetic–pharmacodynamic model for propofol for broad application in anaesthesia and sedation. British Journal of Anaesthesia, 2018;120:942–959. https://doi.org/10.1016/j.bja.2018.01.018
- CRAN tci PD data documentation: https://search.r-project.org/CRAN/refmans/tci/html/eleveld_pd.html
- CRAN source mirror, R/pd_mods.R: https://github.com/cran/tci/blob/master/R/pd_mods.R

## Verification

98 automated tests pass (21 new BIS cases), including malformed/empty input, nonfinite values, endpoints, duplicate rejection, atomic append, sorting, time conversion, resource limits, provenance, last-known observation behavior, and prediction gating. Existing 77 PK/controller/comparison tests remain green. TypeScript and production build pass; the pre-existing large lazy-loaded p5 chunk advisory remains.

Browser checks verified manual entry, pasted preview/append, CSV preview/append with synthetic data, duplicate rejection, point seeking, hide/restore retention, applied-patient clearing and unavailable prediction messaging. No browser errors were reported. The narrow layout was visually inspected. Predicted BIS remains an unfinished Phase 9 item until the original scientific relation is verified.

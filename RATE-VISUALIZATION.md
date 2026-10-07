# Smoothed administration overlay and loading annotations

Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.

The concentration chart retains Cp/Ce/target on its left axis and adds a blue dashed, weight-adjusted input trend on its right axis (mcg/kg/min). The instantaneous mg/min chart and conversions remain available. The default trailing window is 60 seconds, with 30 and 120 seconds available.

## Exact display calculation

For a window ending at t, integrate each piecewise-constant input segment over its overlap with [max(0,t−window),t], then divide by the actual elapsed window duration. Convert mg/min to mcg/kg/min by multiplying by 1000 and dividing by applied total body weight in kg. At t=0 there is no average. This is a causal display calculation, not a change to the controller or drug administration. A trailing average may remain positive briefly after administration stops.

By default, the trend excludes the mass in marked loading intervals; the denominator still includes their elapsed time. “Include loading pulses in average” shows all input. Loading mass always remains in the PK solution and total administered mass.

## Loading convention and limitations

Mark the entire first positive control interval immediately following a target increase, including initial loading from a zero target. This normally lasts 10 seconds; a target event can truncate it. Shade its exact duration on both graphs and show its integrated mass in mg. The instantaneous inspection and main administration readout identify an active loading pulse. Live-window summaries contain only elapsed mass; full-course summaries include forecast mass.

These are **loading / bolus-like pulses**, not separately commanded boluses. There is no clinical rate threshold or new bolus algorithm. Later intervals can have high rates and remain part of the ongoing-input average. A target increase producing zero input is not marked. The sawtooth is a consequence of this simulator's numerical controller, not a claim about a particular pump's operation. No PK/PD equations, constants, or scientific sources changed. Existing model limitations and source-audit uncertainties remain documented in the phase reports and references.

## Verification

- 105 unit tests pass, including seven new cases covering exact mass-weighted averaging, irregular sample spacing, early windows, weight conversion, partial-window overlap, stopping, subdivision invariance, causality, live partial-pulse mass, and Cp/Ce controller annotation accounting.
- TypeScript check and production build pass. The existing p5 bundle-size advisory remains.
- Browser checks confirm adjustable smoothing, inclusion of loading input, separate axes, and clicking a loading-mass label to inspect the corresponding event.

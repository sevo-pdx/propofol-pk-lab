# Adjustable simulation duration

The browser simulator keeps 60 minutes as its default course length. Use **Course length** above the graphs to select 60, 90, 120, 180, 240, 360, or 480 minutes (up to eight hours). Changing the selection recomputes the same population-model experiment and preserves the playhead unless it lies beyond a shortened course, in which case the playhead moves to the new end.

The selected duration sets the end of the numerical trajectory, chart axes, playback clock and scrubber, target-event timeline, model comparison and optional observed-BIS entry/import range. New target events may be added anywhere within that interval. Existing events later than a newly shortened interval are retained and shown again if the course is extended.

For prescribed-input experiments, a stop time may be set anywhere through 480 minutes. If it falls after the selected course end, the simulated input continues through the displayed course end; extending the course reveals the later stop and recovery.

The duration selector is a display and computation horizon. It adds no pharmacokinetic parameters and does not change model equations. The eight-hour maximum bounds browser work and the editable timeline; it is not a clinical limit. These remain hypothetical educational simulations.

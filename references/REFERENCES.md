# Scientific source register

Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.

Accessed 2 October 2026. Source PDFs were read for verification and are not redistributed in this project. Numerical coefficients are transcribed in `src/models/eleveld.ts` with source comments.

## E2018 — primary PK and effect-site source

**Pharmacokinetic–pharmacodynamic model for propofol for broad application in anaesthesia and sedation.** Douglas J. Eleveld, Pieter Colin, Anthony R. Absalom, Michel M. R. F. Struys. *British Journal of Anaesthesia*. 2018;120(5):942–959. DOI: [10.1016/j.bja.2018.01.018](https://doi.org/10.1016/j.bja.2018.01.018).

[University repository publisher PDF](https://pure.rug.nl/ws/files/57897999/Pharmacokinetic_pharmacodynamic_model.pdf).

| Implemented quantity | Exact source location | Coefficient(s) |
|---|---|---|
| Reference age, weight, height, sex | p.943, PK/PD analysis | 35 yr, 70 kg, 170 cm, male |
| V1, V2, V3 coefficients | Table 2, θ1–θ3, p.950 | 6.28, 25.5, 273 L |
| Male CL, Q2 coefficient, Q3 coefficient | Table 2, θ4–θ6 | 1.79, 1.75, 1.11 L/min |
| CL maturation | Table 2, θ8–θ9 | 42.3 weeks; slope 9.06 |
| V2 age coefficient | Table 2, θ10 | −0.0156 /yr |
| CL age/drug coefficient | Table 2, θ11 | −0.00286 /yr |
| Central volume half-saturation weight | Table 2, θ12 | 33.6 kg |
| V3 age/drug coefficient | Table 2, θ13 | −0.0138 /yr |
| Q3 maturation half-saturation age | Table 2, θ14 | 68.3 weeks |
| Female CL coefficient | Table 2, θ15 | 2.10 L/min |
| Q2 maturation coefficient | Table 2, θ16 | 1.30 |
| Arterial ke0 | Table 3, θ2, p.952 | 0.146 /min |
| CL, Q2, Q3 allometric exponent | pp.946,948 | 0.75 |
| ke0 weight exponent | p.948 | −0.25 |
| Covariate formulas and reference normalization | p.948, unnumbered final PK equation block | Implemented directly |
| Missing PMA convention / Q3 age offset | pp.943,948 | 40 weeks |
| Central and Q3 sigmoid slopes | p.948 | 1 |
| Three-compartment structure | p.943 | Derived mass-balance equations in engine |
| Effect-site ODE | p.946 | dCe/dt = ke0(Cp − Ce) |
| Arterial choice for TCI | p.954, Drug transport to effect site | Arterial PK and ke0 |

Population: 1033 individuals, ages 27 weeks PMA–88 years, weights 0.68–160 kg; 30 source studies. PK covariates are age, sex, weight, height via FFM, PMA and concomitant anaesthetics. Population predictions omit random effects and observation error. Limitations include absence of front-end transport kinetics and limited demographic support for some PD extrapolations. Passing numerical tests does not establish clinical predictive accuracy.

## E2018-C — required correction

**Corrigendum to “Pharmacokinetic–pharmacodynamic model for propofol for broad application in anaesthesia and sedation” [Br J Anaesth 2018;120:942–959].** D. J. Eleveld, P. Colin, A. R. Absalom, M. M. R. F. Struys. *British Journal of Anaesthesia*. 2018;121(2):519. DOI: [10.1016/j.bja.2018.05.045](https://doi.org/10.1016/j.bja.2018.05.045).

[Paper with appended corrigendum, final PDF page](https://sofia.medicalistes.fr/spip/IMG/pdf/pharmacokinetic-pharmacodynamic_model_for_propofol_for_broad_application_in_anaesthesia_and_sedation.pdf).

The reference Q2 is corrected to **1.83 L/min**. Table 2's 1.75 remains the coefficient before maturation adjustment. The authors recommend using supplementary NONMEM control streams to avoid transcription errors. Those streams were not retrieved during this phase; independent replay is an outstanding audit item, explicitly flagged in code. No coefficient was invented to compensate.

## A2015 — FFM equation attribution

**Prediction of Fat-Free Mass in Children.** Hesham Saleh Al-Sallami, Ailsa Goulding, Andrea Grant, Rachael Taylor, Nicholas Holford, Stephen Brent Duffull. *Clinical Pharmacokinetics*. 2015;54(11):1169–1178. DOI: [10.1007/s40262-015-0277-z](https://doi.org/10.1007/s40262-015-0277-z). [Bibliographic record](https://pubmed.ncbi.nlm.nih.gov/25940825/).

Implementation source: the complete Al-Sallami equation reproduced in E2018 p.946, not an assumed adult LBM formula. Male maturation constants: 0.88, 13.4, 12.7; female: 1.11, 7.1, 1.1. Size constants: 9270; male denominator 6680 + 216 BMI; female denominator 8780 + 244 BMI. Identity constants (0, 1) come from the stated sigmoid algebra. No separate LBM scalar is substituted.

## Not pharmacological constants

365.25 days/year and 7 days/week are explicit software calendar conventions. SI prefix conversions, BMI's cm-to-m conversion, RK4 coefficients, timestep caps, computational workload limits and example input events are mathematical/software choices. They are not fitted model parameters or administration recommendations.

## Unimplemented / unresolved

- TODO: retrieve E2018 supplementary NONMEM S2 and compare covariate calculations, including the precise year/week convention; current reference check uses rounding tolerance for corrected Q2.
- TODO: verify supplementary PD S4 before implementing BIS. The printed BIS expression and slope labels are internally inconsistent; this phase implements only the verified effect-site ODE and arterial ke0.
- Only one numerical reference patient is explicitly given in the paper/corrigendum. Other tests are analytical checks and equation-property checks, clearly labelled as such.
- Schnider and adult Marsh were added in phase 7 with explicit provenance below. BIS remains unimplemented. No placeholder constants or model fallbacks are included.

## Phase 4 algorithm provenance

**Algorithms to rapidly achieve and maintain stable drug concentrations at the site of drug effect with a computer-controlled infusion pump.** Steven L. Shafer and Keith M. Gregg. *Journal of Pharmacokinetics and Biopharmaceutics*. 1992;20(2):147–169. DOI: [10.1007/BF01070999](https://doi.org/10.1007/BF01070999). [PubMed](https://pubmed.ncbi.nlm.nih.gov/1629794/). Consulted for the conceptual distinction between plasma and effect-site targeting, not as a verified transcription of either published algorithm.

The implemented finite-pulse controller uses linear superposition of responses generated by the existing RK4 engine. Its ten-second control interval, five-second forecast resolution and eight-time-constant/minimum-twenty-minute horizon are documented numerical design choices, not pharmacological parameters. No clinical or hardware constraints are inferred from them. See [phase report](../PHASE-4-5.md) for equations, testing and limitations. The animation uses the unchanged three-compartment and effect-site equations sourced above.

## Phase 7 — Schnider and adult Marsh

### S1998 — original Schnider PK and James LBM

**The influence of method of administration and covariates on the pharmacokinetics of propofol in adult volunteers.** Thomas W. Schnider, Charles F. Minto, Pedro L. Gambus, Corina Andresen, David B. Goodale, Steven L. Shafer, Elizabeth J. Youngs. *Anesthesiology*. 1998;88:1170–1182. DOI [10.1097/00000542-199805000-00006](https://doi.org/10.1097/00000542-199805000-00006).

[Author-uploaded full text](https://www.researchgate.net/publication/232211950_The_Influence_of_Method_of_Administration_and_Covariates_on_the_Pharmacokinetics_of_Propofol_in_Adult_Volunteers). Methods, “Influence of Subject Covariates”, explicitly gives James LBM: male `1.1W − 128(W/H)²`, female `1.07W − 148(W/H)²`; W in kg, H in cm. Table 2 is identified as the final covariate model. Its image was not extracted from this copy; numerical PK entries were verified in the primary research reproductions K2012 and P2017 below. TODO(source-audit): visually cross-check the original Table 2 image as an additional audit, not substitute guessed coefficients.

Population: 24 healthy adult volunteers, age 26–81 years in the PK abstract. Age modifies V2/Q2; weight, height and James LBM modify CL; sex acts through LBM. At high weights the James quadratic turns downward, which can inflate predicted clearance. The application reports the declining branch and rejects nonpositive LBM/volumes/clearances, without clamping or replacing the published scalar. Adult-only UI scope (18+) is a software boundary, not a fitted model bound; extrapolated ages outside the abstract's range are labelled.

### S1999 — fixed Schnider effect-site equilibration

**The influence of age on propofol pharmacodynamics.** Thomas W. Schnider, Charles F. Minto, Steven L. Shafer, Pedro L. Gambus, Corina Andresen, David B. Goodale, Elizabeth J. Youngs. *Anesthesiology*. 1999;90:1502–1516. DOI [10.1097/00000542-199906000-00003](https://doi.org/10.1097/00000542-199906000-00003). [Primary abstract](https://pubmed.ncbi.nlm.nih.gov/10360845/).

Results specify `ke0 = 0.456 min⁻¹`. This application implements that fixed value, not a patient-specific ke0 recalculated to enforce a fixed time-to-peak. No EEG/BIS response relationship is inferred from the effect-site concentration.

### K2012 — primary cross-simulation study, parameter reproduction

**Cross-simulation between two pharmacokinetic models for the target-controlled infusion of propofol.** Jong-Yeop Kim, Dae-Hee Kim, A-Ram Lee, Bong-Ki Moon, Sang-Kee Min. *Korean Journal of Anesthesiology*. 2012;62:309–316. DOI [10.4097/kjae.2012.62.4.309](https://doi.org/10.4097/kjae.2012.62.4.309). [Publisher PDF](https://ekja.org/upload/pdf/kjae-62-309.pdf).

Table 1, p.310, confirms adult Marsh microconstants and Schnider V1, V2, CL and rapid clearance covariate equations (including the female James equation). It reports Schnider ke0 0.456. This study uses Marsh ke0 1.21; **that pairing is not the selected Marsh variant in this application**. Rounded Schnider microconstants in this table are not mixed with exact volume/clearance values.

### P2017 — primary simulation study, volume/clearance reproduction

**Comparison of the clinical performance of the modified Marsh model for propofol between underweight and normal-weight patients with Crohn’s disease.** Soo-Kyung Park, Ji Hyun Park, Hyun Uk Kang, Byung-Moon Choi, Gyu-Jeong Noh. *Korean Journal of Anesthesiology*. 2017;70:606–611. DOI [10.4097/kjae.2017.70.6.606](https://doi.org/10.4097/kjae.2017.70.6.606). [Full PDF](https://www.e-sciencecentral.org/upload/kjae/pdf/kjae-70-606.pdf).

Table 1, p.607, supplies the following Schnider PK entries. Its Q1/Q2 nomenclature corresponds to this application's Q2/Q3. Its PD entries differ from S1999 and C2010; they are **not used**.

| Quantity | Published constants/equation | Implementation source |
|---|---|---|
| V1 | 4.27 L | S1998 as reproduced P2017 Table 1 |
| V2 | 18.9 − 0.391(age − 53) L | K2012 / P2017 Table 1 |
| V3 | 238 L | P2017 Table 1 |
| CL | 1.89 + 0.0456(W − 77) − 0.0681(LBM − 59) + 0.0264(H − 177) L/min | K2012 / P2017 Table 1 |
| Q2 | 1.29 − 0.024(age − 53) L/min | K2012 / P2017 Table 1 |
| Q3 | 0.836 L/min | P2017 Table 1 |
| ke0 | 0.456 min⁻¹ | S1999 Results, K2012 Table 1 |

### M1991 — Marsh attribution and distinction from pediatric revision

**Pharmacokinetic model driven infusion of propofol in children.** B. Marsh, M. White, N. Morton, G. N. Kenny. *British Journal of Anaesthesia*. 1991;67:41–48. DOI [10.1093/bja/67.1.41](https://doi.org/10.1093/bja/67.1.41). [Primary abstract](https://pubmed.ncbi.nlm.nih.gov/1859758/).

The paper evaluated an adult model in 20 children and a revised fit in another 10. This simulator implements the **adult Marsh parameterization** reproduced in W2013, not the revised pediatric microconstants. The original full parameter table was not available in this audit; the independently published complete adult parameter set is used explicitly. Weight scaling alone does not establish suitability across ages, obesity or other populations.

### W2013 — complete adult Marsh PK parameter set

**Estimating the plasma effect-site equilibrium rate constant (Ke0) of propofol by fitting time of loss and recovery of consciousness.** Qi Wu, Baozhu Sun, Shuqin Wang, Lianying Zhao, Feng Qi. *Biological and Pharmaceutical Bulletin*. 2013;36:1420–1427. DOI [10.1248/bpb.b12-01093](https://doi.org/10.1248/bpb.b12-01093). [Publisher full text](https://www.jstage.jst.go.jp/article/bpb/36/9/36_b12-01093/_html/-char/en).

Table 1: `V1 = 0.228W L`, `k10 = 0.119`, `k12 = 0.112`, `k21 = 0.055`, `k13 = 0.0419`, `k31 = 0.0033 min⁻¹`. CL/Q2/Q3 are V1 times the relevant outward microconstant; V2 = Q2/k21 and V3 = Q3/k31. This avoids mixing inconsistently rounded peripheral-volume coefficients. The study's newly fitted ke0 is not implemented. Its Figure 1 uses 60 kg, used here to anchor a parameter test, not reproduce a measured clinical response.

### C2010 — explicit Marsh + fixed ke0 pairing

**Study of the time course of the clinical effect of propofol compared with the time course of the predicted effect-site concentration: performance of three pharmacokinetic–dynamic models.** M. Coppens, J. G. M. Van Limmen, T. Schnider, B. Wyler, S. Bonte, F. Dewaele, M. M. R. F. Struys, H. E. M. Vereecke. *British Journal of Anaesthesia*. 2010;104:452–458. DOI [10.1093/bja/aeq028](https://doi.org/10.1093/bja/aeq028).

Methods Group M explicitly pairs Marsh PK with `ke0 = 0.26 min⁻¹`. The UI names that variant; this is not a claim that Marsh 1991 estimated a PD constant, nor a claim of superiority. The study demonstrates limitations of equating predicted Ce with an immediate constant clinical effect. Other published Marsh pairings are distinct models for effect-site purposes.

### Phase 7 verification limits

Tests compare published coefficients/microconstants (tolerance 1e-12), algebraically calculated example patients (1e-10), and numerical trajectories against an independent matrix exponential (1e-7). No exact independently tabulated Schnider patient output was found in the accessed primary sources; the age-53 example is explicitly a synthetic, rational-arithmetic fixture, not a published patient. TODO(source-audit): obtain independently tabulated patient outputs or original source-code replay for both models. Numerical tests do not establish clinical accuracy. No missing constant was replaced with an assumed value.

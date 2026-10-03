import type {ModelKey} from './registry';
/** TODO(source-audit): resolve E2018's printed BIS equation and slope-label
 * discrepancy against original supplementary NONMEM S4 before enabling BIS.
 * CRAN tci's branch assignment differs from E2018 Table 3; its implementation
 * alone cannot resolve the original source discrepancy. Never substitute a
 * generic Hill curve, a borrowed model's PD constants, or fabricated outputs.
 */
export function predictedBISAvailability(model:ModelKey):{available:false;reason:string}{
 return {available:false,reason:model==='eleveld'
  ?'Eleveld BIS prediction is awaiting verification of the original supplementary PD equations. The printed equation and slope labels are inconsistent; no assumed curve is shown.'
  :'No verified BIS relationship is implemented for this model. Its effect-site ke0 predicts Ce, not BIS. A BIS relationship from another PK model is not substituted.'};
}

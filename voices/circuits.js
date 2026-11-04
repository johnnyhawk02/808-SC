// Registry of the component-level voices (dsp/kit.js builds one of each).
import { BDCircuit } from './bd-circuit.js';
import { SDCircuit } from './sd-circuit.js';
import { RSCircuit, CLCircuit } from './rscl-circuit.js';
import { CPCircuit, MACircuit } from './cpma-circuit.js';
import { CBCircuit } from './cb-circuit.js';
import { CYCircuit } from './cy-circuit.js';
import { OHCircuit, CHCircuit } from './hats-circuit.js';
import { LTCircuit, MTCircuit, HTCircuit, LCCircuit, MCCircuit, HCCircuit } from './tom-circuit.js';
export const CIRCUITS = {
  bd: BDCircuit, sd: SDCircuit,
  lt: LTCircuit, mt: MTCircuit, ht: HTCircuit, lc: LCCircuit, mc: MCCircuit, hc: HCCircuit,
  rs: RSCircuit, cl: CLCircuit, cp: CPCircuit, ma: MACircuit,
  cb: CBCircuit, cy: CYCircuit, oh: OHCircuit, ch: CHCircuit,
};

// Per knob case scores for one or more voices (worst first): node test/match-cases.mjs <id...>
import { compare } from './match.mjs';
for (const id of process.argv.slice(2)) {
  const rows = compare(id).map((r) => ({ id, ...r })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const r of rows) console.log(id, r.case.padEnd(9), Object.entries(r).filter(([k, v]) => typeof v === 'number').map(([k, v]) => `${k} ${v.toFixed(1)}`).join('  '));
}

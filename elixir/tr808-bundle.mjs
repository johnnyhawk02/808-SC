// Bundles the TR-808 voice code (../dsp and ../voices, the bench's own files, unchanged) into one classic script that
// defines a global TR808, so it runs in Elixir's AudioWorklet, on the page and in the Cache button's worker, like the
// LXR engine does. Each ES module becomes a function scope (several files export a `meta`), run in import order.
//   bundle808() -> source text
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const ENTRIES = ['dsp/kit.js', 'dsp/cache.js', 'dsp/cache-build.js', 'voices/circuits.js'];
const EXPORTS = ['Kit', 'VOICES', 'VOLT_SCALE', 'CIRCUITS', 'CachedVoice', 'readWav', 'buildCache'];

const IMPORT = /^import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';[ \t]*\n/gm;
const join = (from, rel) => {
  const parts = from.split('/').slice(0, -1);
  for (const p of rel.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); }
  return parts.join('/');
};

export function bundle808() {
  const mods = new Map(); // path -> { deps, body }
  const load = (path) => {
    if (mods.has(path)) return;
    let src = readFileSync(new URL(path, root), 'utf8');
    const deps = [], names = [];
    src = src.replace(IMPORT, (_, list, rel) => {
      const dep = join(path, rel); deps.push(dep);
      const binds = list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': '));
      return `const { ${binds.join(', ')} } = __m[${JSON.stringify(dep)}];\n`;
    });
    if (/^\s*import\s/m.test(src)) throw new Error(`${path}: an import this bundler doesn't read`);
    // (export const A = .., B = ..; declares several on one line)
    src = src.replace(/^export\s+(const|let|function|class)\s+([A-Za-z_$][\w$]*)(.*)$/gm, (_, kw, name, rest) => {
      names.push(name);
      if (kw === 'const' || kw === 'let') for (const m of rest.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=(?!=)/g)) names.push(m[1]);
      return `${kw} ${name}${rest}`;
    });
    src = src.replace(/^export\s*\{([^}]*)\};?[ \t]*\n/gm, (_, list) => { names.push(...list.split(',').map((s) => s.trim()).filter(Boolean)); return ''; });
    if (/^export\s/m.test(src)) throw new Error(`${path}: an export this bundler doesn't read`);
    mods.set(path, { deps, body: `${src}\nreturn { ${names.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };` });
    deps.forEach(load);
  };
  ENTRIES.forEach(load);
  // dependencies first
  const order = [], seen = new Set();
  const visit = (p) => { if (seen.has(p)) return; seen.add(p); mods.get(p).deps.forEach(visit); order.push(p); };
  ENTRIES.forEach(visit);
  const body = order.map((p) => `// ---- ${p}\n__m[${JSON.stringify(p)}] = (() => {\n${mods.get(p).body}\n})();`).join('\n');
  const pick = EXPORTS.map((n) => {
    const from = ENTRIES.find((e) => new RegExp(`return \\{[^}]*\\b${n}\\b`).test(mods.get(e).body.slice(-400)));
    if (!from) throw new Error(`TR808 bundle: nothing exports ${n}`);
    return `${n}: __m[${JSON.stringify(from)}].${n}`;
  });
  return `const TR808 = (() => {\nconst __m = {};\n${body}\nreturn { ${pick.join(', ')} };\n})();\n`;
}

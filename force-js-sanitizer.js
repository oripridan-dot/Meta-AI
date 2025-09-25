const Module = require('module');

function extractCode(text){
  if(!text) return '';
  const t = String(text).trim();
  const jsFence = t.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/i);
  if(jsFence) return jsFence[1].trim();
  const anyFence = t.match(/```([a-z0-9_-]*)\s*\n([\s\S]*?)```/i);
  if(anyFence && anyFence[1] && !/^(js|javascript)?$/i.test(anyFence[1])) return '';
  if(anyFence) return anyFence[2].trim();
  const mod = t.match(/module\.exports\s*=\s*(?:async\s*)?function\s*\([^)]*\)\s*\{[\s\S]*$/);
  if(mod) return mod[0].trim();
  const decl = t.match(/^(?:async\s*)?function\s+[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{[\s\S]*$/m);
  if(decl) return decl[0].trim();
  return t;
}
function looksLikeNonJS(code){
  if(!code) return true;
  const c = String(code);
  return /\bdef\s+[a-zA-Z_]/.test(c) || /```(python|py|bash|sh|go|rust|java)\b/i.test(c);
}
function normalize(code){
  if(!code) return '';
  if(looksLikeNonJS(code)) return '';
  const s = String(code).trim();
  if(/module\.exports\s*=/.test(s)) return s;
  const fn = s.match(/^(?:async\s*)?function\s+[a-zA-Z_$][\w$]*\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/m);
  if(fn) return `module.exports = function(${fn[1]||''}) {${fn[2]||''}}`;
  const arrow = s.match(/^\s*const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*\}\s*;?\s*$/m);
  if(arrow) return `${s}\nmodule.exports = ${arrow[1]};\n`;
  return s;
}

const _load = Module._load;
Module._load = function(request, parent, isMain){
  const mod = _load(request, parent, isMain);
  if(!/deepseek-client/.test(request)) return mod;
  const Client = mod?.default || mod;
  if(typeof Client !== 'function') return mod;
  class Patched extends Client {
    async generateCode(prompt, task){
      const out = await super.generateCode(prompt, task);
      // support both {code,...} and plain string
      if (typeof out === 'object' && out !== null) {
        return { ...out, code: normalize(extractCode(out.code)) };
      } else {
        return normalize(extractCode(out));
      }
    }
  }
  Object.keys(Client).forEach(k => Patched[k] = Client[k]);
  return Patched;
};

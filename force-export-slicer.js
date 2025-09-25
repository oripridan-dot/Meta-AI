const Module = require('module');
const _load = Module._load;

function stripFences(s){ return String(s||'').replace(/```[\s\S]*?```/g,'').trim(); }
function onlyExport(s){
  if(!s) return '';
  const m = String(s).match(/module\.exports\s*=\s*(?:async\s*)?function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*;?/m);
  return m ? m[0] : '';
}

Module._load = function(req, parent, isMain){
  const mod = _load(req, parent, isMain);

  // Patch any module whose id contains "code-executor"
  if (/(^|\/)code-executor(\.js)?$/.test(req) || /code-executor/.test(parent?.id||'')) {
    const Exec = mod?.default || mod;
    if (typeof Exec === 'function' && Exec.prototype?.executeCode) {
      const orig = Exec.prototype.executeCode;
      Exec.prototype.executeCode = async function(code, fn, input){
        const clean = stripFences(code);
        const sliced = onlyExport(clean);
        if(!sliced) return { success:false, error:'No module.exports function in code', executionTime:Infinity, memoryUsed:Infinity, testInput:input, functionName:fn };
        return orig.call(this, sliced, fn, input);
      };
    }
  }
  return mod;
};

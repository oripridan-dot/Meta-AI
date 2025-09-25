const Module = require('module');

/* ---------- helpers ---------- */
function extractCode(text){
  if(!text) return '';
  const t = String(text).trim();
  const js = t.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/i);
  if(js) return js[1].trim();
  const any = t.match(/```([a-z0-9_-]*)\s*\n([\s\S]*?)```/i);
  if(any && any[1] && !/^(js|javascript)?$/i.test(any[1])) return ''; // non-JS fenced -> force retry
  if(any) return any[2].trim();
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
function normalizeToCJS(code){
  if(!code) return '';
  if(looksLikeNonJS(code)) return '';
  const s = String(code).trim();
  if(/module\.exports\s*=/.test(s)) return s;
  const decl = s.match(/^(?:async\s*)?function\s+[a-zA-Z_$][\w$]*\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/m);
  if(decl) return `module.exports = function(${decl[1]||''}) {${decl[2]||''}}`;
  const arrow = s.match(/^\s*const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*\}\s*;?\s*$/m);
  if(arrow) return `${s}\nmodule.exports = ${arrow[1]};\n`;
  return s;
}

/* ---------- patch require() ---------- */
const _load = Module._load;
Module._load = function(request, parent, isMain){
  // Patch the DeepSeek client: enforce JS and object shape
  if(/deepseek-client/.test(request)){
    const Orig = _load(request, parent, isMain);
    const Client = Orig?.default || Orig;
    if(typeof Client === 'function'){
      class Patched extends Client{
        async generateCode(prompt, task){
          const t0 = Date.now();
          const out = await super.generateCode(prompt, task);
          let code='', requestTime=Date.now()-t0, tokensUsed=0;

          if (typeof out === 'object' && out !== null) {
            code = out.code ?? '';
            requestTime = Number.isFinite(out.requestTime) ? out.requestTime : requestTime;
            tokensUsed = Number(out.tokensUsed||0);
          } else {
            code = String(out||'');
          }

          const sanitized = normalizeToCJS(extractCode(code));
          return { code: sanitized, requestTime, tokensUsed };
        }
      }
      Object.assign(Patched, Client);
      return Patched;
    }
    return Orig;
  }

  // Patch the CodeExecutor: safe VM + export contract
  if(/code-executor/.test(request)){
    const Mod = _load(request, parent, isMain);
    const Exec = Mod?.default || Mod;
    if(typeof Exec === 'function'){
      const proto = Exec.prototype;
      const orig = proto.executeCode;
      proto.executeCode = async function(code, functionName, testInput){
        // Reject non-JS early so engine retries
        const stripped = String(code||'').replace(/```[\s\S]*?```/g,'').trim();
        if (!stripped || looksLikeNonJS(stripped)) {
          return { success:false, error:'Non-JS or empty code returned from model', executionTime:Infinity, memoryUsed:Infinity, testInput, functionName };
        }
        // Build a VM with CommonJS in sandbox and return module.exports
        const vm2 = _load('vm2', parent, isMain);
        const { VM } = vm2;
        const vm = new VM({ timeout: Number(process.env.EXECUTION_TIMEOUT_MS||5000),
                            sandbox: { module:{exports:undefined}, exports:{} } });
        try{
          const wrapped = `(function(){\n${stripped}\nreturn (typeof module!=="undefined"&&module&&module.exports)?module.exports:(typeof exports==="function"?exports:undefined);\n})()`;
          const exported = vm.run(wrapped);
          if (typeof exported !== 'function'){
            const prev = stripped.slice(0,160).replace(/\s+/g,' ');
            return { success:false, error:'Generated code did not export a function. First 160: '+prev, executionTime:Infinity, memoryUsed:Infinity, testInput, functionName };
          }
          const out = await Promise.resolve(exported(testInput));
          return { success:true, result:out, executionTime:0, memoryUsed:0, testInput, functionName };
        }catch(e){
          return { success:false, error:`Execution error: ${e.message}`, executionTime:Infinity, memoryUsed:Infinity, testInput, functionName };
        }
      };
      return Mod;
    }
    return Mod;
  }

  return _load(request, parent, isMain);
};

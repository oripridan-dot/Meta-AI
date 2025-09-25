const Module = require('module');
const _load = Module._load;

Module._load = function(request, parent, isMain) {
  if (request !== 'vm2') return _load(request, parent, isMain);

  // Load the real vm2
  const vm2 = _load(request, parent, isMain);
  const OrigVM = vm2.VM;

  class PatchedVM extends OrigVM {
    constructor(opts = {}) {
      opts = opts || {};
      const sb = Object.assign({}, opts.sandbox || {});
      // Ensure CommonJS objects exist in the sandbox
      if (!sb.module) sb.module = { exports: undefined };
      if (!('exports' in sb)) sb.exports = {};
      opts.sandbox = sb;
      super(opts);
    }
    run(code, filename) {
      if (typeof code === 'string') {
        // Make vm.run(code) evaluate to module.exports (or a callable export) when present
        const tail =
          '\n; (typeof module!=="undefined" && module && module.exports) ? module.exports ' +
          ': (typeof exports==="function" ? exports : undefined)';
        return super.run(code + tail, filename);
      }
      return super.run(code, filename);
    }
  }

  // Return the same vm2 API but with our PatchedVM
  return { ...vm2, VM: PatchedVM };
};

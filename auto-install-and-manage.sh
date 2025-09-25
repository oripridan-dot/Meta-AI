#!/usr/bin/env bash
set -euo pipefail

APP_NAME="meta-ai"
ROOT_DIR="$(pwd)"
NODE_MIN_MAJOR=18
DB_DEFAULT_PATH="$ROOT_DIR/meta-ai.sqlite"

say() { echo -e "\033[1;36m[${APP_NAME}]\033[0m $*"; }
warn() { echo -e "\033[1;33m[${APP_NAME} WARNING]\033[0m $*"; }
err() { echo -e "\033[1;31m[${APP_NAME} ERROR]\033[0m $*"; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || return 1; }

ensure_node() {
  if need_cmd node; then
    local v; v=$(node -v | sed 's/^v//');
    local major=${v%%.*}
    if (( major < NODE_MIN_MAJOR )); then
      warn "Node ${v} detected (< ${NODE_MIN_MAJOR}). Installing LTS via nvm..."
      install_nvm_and_node
    else
      say "Node ${v} OK"
    fi
  else
    say "Node not found. Installing via nvm..."
    install_nvm_and_node
  fi
}

install_nvm_and_node() {
  if ! need_cmd curl; then err "curl is required to install nvm"; exit 1; fi
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
  say "Installed Node $(node -v)"
}

ensure_sqlite() {
  if need_cmd sqlite3; then
    say "sqlite3 present ($(sqlite3 --version | awk '{print $1}'))"
  else
    warn "sqlite3 not found. Attempting install (Linux apt/yum or macOS brew)."
    if need_cmd apt-get; then sudo apt-get update && sudo apt-get install -y sqlite3; 
    elif need_cmd yum; then sudo yum install -y sqlite; 
    elif need_cmd brew; then brew install sqlite; 
    else err "Please install sqlite3 manually."; exit 1; fi
  fi
}

ensure_pm2() {
  if need_cmd pm2; then
    say "pm2 present ($(pm2 -v))"
  else
    say "Installing pm2 globally..."
    npm i -g pm2
  fi
}

ensure_env() {
  if [ ! -f .env ]; then
    say "Creating .env"
    cat > .env <<EOF
# --- Meta-AI runtime ---
DEEPSEEK_API_KEY=
META_AI_DB=${DB_DEFAULT_PATH}
NODE_ENV=production
EOF
    warn "Fill in DEEPSEEK_API_KEY in .env after this script completes if left blank."
  else
    say ".env exists — leaving as-is"
  fi
}

npm_install() {
  if [ -f package-lock.json ]; then
    say "Installing dependencies (npm ci)"
    npm ci || npm install
  else
    say "Installing dependencies (npm install)"
    npm install
  fi
}

ensure_file() {
  local path="$1"; shift
  local label="$1"; shift || true
  if [ -f "$path" ]; then
    say "$label exists — leaving in place: $path"
  else
    say "Creating $label: $path"
    mkdir -p "$(dirname "$path")"
    cat > "$path" <<'EOF'
$CONTENT$
EOF
  fi
}

# --- Templated contents for new files ---
PROMPT_BUILDER_JS='// src/core/prompt-builder.js
module.exports = function buildPrompt({ task, basePrompt, learnings = [], perf = {} }) {
  const taskHints = {
    fibonacci: "Use O(n) iterative or memoized; handle n=0,1.",
    prime: "Check up to √n; special-case 2; skip even numbers; consider 6k±1.",
    factorial: "Iterative to avoid stack issues; n=0→1; consider BigInt."
  }[task] || "";
  const arr = Array.isArray(learnings) ? learnings : Array.from(learnings || []);
  const learnStr = arr.length ? `Apply these proven techniques: ${arr.slice(-3).join(', ')}.` : "";
  const hints = [];
  if (Number.isFinite(perf.execMs) && perf.execMs > 10) hints.push("Prioritize algorithmic efficiency.");
  if (Number.isFinite(perf.quality) && perf.quality < 60) hints.push("Prefer clear naming and low cyclomatic complexity.");
  return [
    `Create a JavaScript function named ${task} that solves: ${basePrompt}.`,
    taskHints,
    learnStr,
    hints.join(' '),
    "Constraints: return only the complete function (no markdown, no prose).",
    `Ensure the function is named exactly \"${task}\" and accepts a single parameter.`
  ].filter(Boolean).join(' ');
};
'

DB_JS='// src/data/db.js
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const DB_PATH = process.env.META_AI_DB || path.join(process.cwd(), "meta-ai.sqlite");
const db = new sqlite3.Database(DB_PATH);
const initSql = `
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  prompt TEXT NOT NULL,
  code TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS learnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  text TEXT NOT NULL,
  weight REAL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;
for (const stmt of initSql.split(";").map(s => s.trim()).filter(Boolean)) db.run(stmt);
function saveGeneration({ task, prompt, code, metrics }) { return new Promise((resolve, reject) => { db.run(`INSERT INTO generations (task,prompt,code,metrics_json) VALUES (?,?,?,?)`, [task,prompt,code,JSON.stringify(metrics||{})], function(err){ if(err) return reject(err); resolve({ id:this.lastID }); }); }); }
function saveLearning({ task, text, weight = 1 }) { return new Promise((resolve, reject) => { db.run(`INSERT INTO learnings (task,text,weight) VALUES (?,?,?)`, [task,text,weight], function(err){ if(err) return reject(err); resolve({ id:this.lastID }); }); }); }
function getLatestLearningsForTask(task, limit=3) { return new Promise((resolve, reject) => { db.all(`SELECT text FROM learnings WHERE task=? ORDER BY created_at DESC, id DESC LIMIT ?`, [task,limit], (err, rows)=>{ if(err) return reject(err); resolve(rows.map(r=>r.text)); }); }); }
function getRecentGenerations(task, limit=10) { return new Promise((resolve, reject) => { db.all(`SELECT id,task,prompt,code,metrics_json,created_at FROM generations WHERE task=? ORDER BY id DESC LIMIT ?`, [task,limit], (err, rows)=>{ if(err) return reject(err); resolve(rows.map(r=>({ ...r, metrics: JSON.parse(r.metrics_json) }))); }); }); }
module.exports = { saveGeneration, saveLearning, getLatestLearningsForTask, getRecentGenerations };
'

INDEX_JS='// src/index.js
require("dotenv").config();
const MetaAI = require("./core/meta-ai-engine"); // adjust if different
(async () => {
  const task = process.argv[2] || "fibonacci";
  const input = Number(process.argv[3] || 25);
  const basePrompt = `Solve ${task} correctly and efficiently.`;
  const meta = new MetaAI(process.env.DEEPSEEK_API_KEY);
  const result = await meta.runMultipleEvolutions(task, basePrompt, input, 3, { verbose: true });
  console.log(JSON.stringify(result?.summary || result, null, 2));
})();
'

SMOKE_JS='// smoke.js
require("dotenv").config();
const { getLatestLearningsForTask, getRecentGenerations } = require("./src/data/db");
(async () => {
  const task = process.argv[2] || "fibonacci";
  console.log("Recent learnings:", await getLatestLearningsForTask(task, 3));
  const gens = await getRecentGenerations(task, 5);
  console.log("Recent generations (ids):", gens.map(g=>g.id));
})();
'

ECOSYSTEM_CJS='// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "meta-ai",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" }
    }
  ]
};
'

# --- Create new files if missing ---
create_if_missing() {
  local file="$1"; local content_var="$2"; local label="$3"
  if [ ! -f "$file" ]; then
    say "Creating $label at $file"
    mkdir -p "$(dirname "$file")"
    eval "printf '%s' \"\${$content_var}\" > \"$file\""
  else
    say "$label exists — skipping create: $file"
  fi
}

patch_deepseek_client() {
  local file="src/api/deepseek-client.js"
  if [ ! -f "$file" ]; then
    warn "$file not found; skipping patch"
    return
  fi
  say "Patching $file (backup at ${file}.bak)"
  cp "$file" "${file}.bak"
  # Add expectedName parameter and validation if not present
  if ! grep -q "expectedName" "$file"; then
    sed -i.bak2 -E \
      -e 's/async generateCode\(([^)]*)\)/async generateCode(\1, expectedName)/' \
      -e 's/const content = ([^;]*);/const content = \1;\n    const code = this.extractCode(content, expectedName);\n    return code;\n  }\n\n  extractCode(response, expectedName) {\n    let code = String(response || \"\").trim();\n    code = code.replace(^```[\\s\\S]*?\\n?|\\n?```$,'\''\'\'\''\\''\'\''\'').trim();\n    if (!expectedName) return code;\n    const decl = new RegExp(`function\\\\s+\${expectedName}\\\\s*\\\\(`);\n    const assign = new RegExp(`\\\\b(const|let|var)\\\\s+\${expectedName}\\\\s*=\\\\s*(?:function|\\\\([^)]*\\\\)\\\\s*=>)`);\n    if (!(decl.test(code) || assign.test(code))) {\n      throw new Error(`Model did not return a function named \"\${expectedName}\".`);\n    }\n    return code;\n  }\n\n  // keep existing method below if present/g' "$file" || warn "sed adjustments may have partially applied; please review ${file}"
  fi
}

patch_meta_ai_engine() {
  local file="src/core/meta-ai-engine.js"
  if [ ! -f "$file" ]; then
    warn "$file not found; skipping patch"
    return
  fi
  say "Patching $file (backup at ${file}.bak)"
  cp "$file" "${file}.bak"
  # Import prompt builder & db if not present
  grep -q "prompt-builder" "$file" || sed -i -E '1a const buildPrompt = require("../core/prompt-builder");\nconst { saveGeneration, saveLearning, getLatestLearningsForTask } = require("../data/db");' "$file"
  # Replace evolvePrompt body to use builder
  if grep -n "evolvePrompt\(" "$file" >/dev/null; then
    awk 'BEGIN{p=0} /evolvePrompt\(/ {print; p=1; next} p==1 && /\}/ {print "    const last = this.generationHistory && this.generationHistory[this.generationHistory.length - 1];\n    const perf = last ? { execMs: last?.performance?.execution?.executionTime, quality: last?.performance?.quality?.overallScore } : {};\n    const learnings = await getLatestLearningsForTask(task, 3);\n    return buildPrompt({ task, basePrompt, learnings, perf });"; p=0; next} p==1 {next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
  # Pass task to generateCode
  grep -q "client.generateCode(.*task" "$file" || sed -i -E 's/client\.generateCode\(([^)]*)\)/client.generateCode(\1, task)/' "$file"
  # Save generation & learning after scoring
  if ! grep -q "saveGeneration({ task, prompt, code, metrics" "$file"; then
    sed -i -E 's@(\/\/.*execution.*end[^
]*\n)@\1    await saveGeneration({ task, prompt, code, metrics: performance });\n    if (typeof bestTechnique !== \"undefined\" && bestTechnique) await saveLearning({ task, text: bestTechnique, weight: 1 });\n@' "$file" || true
  fi
}

pm2_setup() {
  say "Configuring pm2 service"
  create_if_missing ecosystem.config.cjs ECOSYSTEM_CJS "pm2 ecosystem"
  pm2 start ecosystem.config.cjs || true
  pm2 save
  # pm2 startup returns a command we must run; attempt auto-run
  local startup_cmd
  startup_cmd=$(pm2 startup | tail -n 1 || true)
  if [[ "$startup_cmd" == sudo* ]]; then
    say "Running pm2 startup command: $startup_cmd"
    eval "$startup_cmd"
    pm2 save
  else
    warn "Could not auto-detect pm2 startup command. Please run the command shown above manually if needed."
  fi
}

main() {
  say "Bootstrap starting in $ROOT_DIR"
  ensure_node
  ensure_sqlite
  ensure_pm2
  ensure_env
  npm_install

  create_if_missing "src/core/prompt-builder.js" PROMPT_BUILDER_JS "prompt-builder"
  create_if_missing "src/data/db.js" DB_JS "SQLite data layer"
  create_if_missing "src/index.js" INDEX_JS "entrypoint"
  create_if_missing "smoke.js" SMOKE_JS "smoke test"

  patch_deepseek_client
  patch_meta_ai_engine

  say "Running initial app boot (npm start)"
  npm start || warn "npm start exited non-zero — check logs above."

  pm2_setup

  say "All set! Service managed by pm2 as \"${APP_NAME}\". Useful commands:"
  cat <<HELP
  pm2 status
  pm2 logs ${APP_NAME}
  pm2 restart ${APP_NAME}
  pm2 stop ${APP_NAME}
  pm2 delete ${APP_NAME}
  node smoke.js fibonacci
HELP

  if grep -q "DEEPSEEK_API_KEY=" .env && grep -q "DEEPSEEK_API_KEY=$" .env; then
    warn "DEEPSEEK_API_KEY is empty in .env. Add your key and then: pm2 restart ${APP_NAME}"
  fi
}

main "$@"

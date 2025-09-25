// db.js (Gemini Version)
const sqlite3 = require('sqlite3');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DB_PATH = path.resolve(__dirname, './meta-ai.sqlite');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let db = new sqlite3.Database(DB_PATH);

// --- Core Database Helpers ---
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

// --- Embedding and Similarity Logic (Using Gemini) ---
async function generateEmbedding(text) {
    try {
        console.log(`🧠 Generating embedding with Gemini for: "${text}"`);
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        return embedding.values; // Return the vector array
    } catch (error) {
        console.error("Error generating Gemini embedding:", error.message);
        return null;
    }
}

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}

// --- Public Module Functions ---
const saveGeneration = (data) => {
    const sql = `INSERT INTO generations (task_name, generated_code, success, execution_time, prompt_used, error_message, parent_generation_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [data.taskName, data.generatedCode, data.success, data.executionTime || null, data.prompt, data.error ? data.error.message : null, data.parentId || null];
    return run(sql, params);
};

const saveGoldenPattern = async (data) => {
    const embeddingVector = await generateEmbedding(data.taskPrompt);
    if (!embeddingVector) return;

    console.log(`💾 Saving new golden pattern for task "${data.taskName}"`);
    const sql = `INSERT INTO golden_patterns (task_name, validated_code, performance_score, prompt_embedding) VALUES (?, ?, ?, ?)`;
    const params = [data.taskName, data.validatedCode, data.performanceScore, JSON.stringify(embeddingVector)];
    return run(sql, params);
};

const getGoldenPatterns = async (newTaskPrompt, limit = 2) => {
    console.log(`🔍 Searching for patterns conceptually similar to: "${newTaskPrompt}"`);
    const newEmbedding = await generateEmbedding(newTaskPrompt);
    if (!newEmbedding) return [];

    const allPatterns = await all(`SELECT validated_code, prompt_embedding FROM golden_patterns`);
    if (allPatterns.length === 0) return [];

    const patternsWithScores = allPatterns.map(pattern => {
        const storedEmbedding = JSON.parse(pattern.prompt_embedding);
        const score = cosineSimilarity(newEmbedding, storedEmbedding);
        return { code: pattern.validated_code, score };
    });

    patternsWithScores.sort((a, b) => b.score - a.score);
    const topPatterns = patternsWithScores.slice(0, limit);

    const scores = topPatterns.map(p => p.score.toFixed(2));
    if (topPatterns.length > 0) {
     console.log(`💡 Found ${topPatterns.length} conceptually similar patterns with scores: ${scores.join(', ')}`);
    }
    
    return topPatterns.map(p => ({ validated_code: p.code }));
};

module.exports = { saveGeneration, saveGoldenPattern, getGoldenPatterns };

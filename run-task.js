// run-task.js
require('dotenv').config();
const sqlite3 = require('sqlite3');
const path = require('path');
const MetaAI = require('./meta-ai-engine.js');

const DB_PATH = path.resolve(__dirname, './meta-ai.sqlite');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// --- The New Task ---
const fibonacciTask = {
    name: 'fibonacci',
    prompt: 'Write a Javascript function named "fib" that calculates the nth Fibonacci number.'
};

async function main() {
    if (!DEEPSEEK_API_KEY) {
        return console.error("❌ API Key not found in .env file.");
    }

    const db = new sqlite3.Database(DB_PATH);
    
    // Helper function to save generations to the database
    const dbSaver = (data) => new Promise((resolve, reject) => {
        const sql = `INSERT INTO generations (task_name, generated_code, success, execution_time, prompt_used, error_message, parent_generation_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [data.taskName, data.generatedCode, data.success, data.executionTime || null, data.prompt, data.error ? data.error.message : null, data.parentId || null];
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });

    try {
        const metaAi = new MetaAI({ apiKey: DEEPSEEK_API_KEY, dbSaver });
        const finalResult = await metaAi.run(fibonacciTask);

        console.log("\n--- ✅ Task Complete ---");
        if (finalResult.success) {
            console.log("Final Status: SUCCESS");
            console.log("The AI generated the following code:");
            console.log("------------------------------------");
            console.log(finalResult.code);
            console.log("------------------------------------");
        } else {
            console.log("Final Status: FAILURE");
            console.log("The AI could not produce a working solution.");
            console.log("Last error:", finalResult.error.message);
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
    } finally {
        db.close();
    }
}

main();
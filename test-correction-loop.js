// test-correction-loop.js

require('dotenv').config();
const path = require('path');
const MetaAI = require('./meta-ai-engine.js');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, './meta-ai.sqlite');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
    console.error("❌ FATAL: DEEPSEEK_API_KEY is not set in your .env file.");
    process.exit(1);
}

const testTask = {
    name: 'addAndLog',
    prompt: "Write a Javascript function that calls a non-existent function."
};

async function runValidationTest() {
    console.log('🚀 Starting validation test...');
    const db = new sqlite3.Database(DB_PATH);
    
    // Promisify db methods for async/await
    const dbRun = (sql, params) => new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });
    const dbAll = (sql, params) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    const dbGet = (sql) => new Promise((resolve, reject) => {
        db.get(sql, (err, row) => err ? reject(err) : resolve(row));
    });

    try {
        const metaAi = new MetaAI({ apiKey: DEEPSEEK_API_KEY });
        
        const saveToDb = (data) => {
            const { taskName, generatedCode, success, executionTime, prompt, error, parentId } = data;
            const sql = `INSERT INTO generations (task_name, generated_code, success, execution_time, prompt_used, error_message, parent_generation_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const params = [taskName, generatedCode, success, executionTime || null, prompt, error ? error.message : null, parentId || null];
            return dbRun(sql, params);
        };

        const lastIdRow = await dbGet("SELECT MAX(id) as maxId FROM generations");
        const lastIdBeforeTest = lastIdRow ? lastIdRow.maxId : 0;

        await metaAi.run(testTask, saveToDb);
        console.log('✅ Test run complete. Verifying results...');

        const results = await dbAll(`SELECT id, success, error_message, parent_generation_id FROM generations WHERE id > ? ORDER BY id ASC LIMIT 2`, [lastIdBeforeTest]);

        console.log('--- Verifying Assertions ---');
        if (results.length !== 2) throw new Error(`Expected 2 new entries, but found ${results.length}.`);

        const [firstAttempt, secondAttempt] = results;

        if (firstAttempt.success) throw new Error('Assertion failed: First attempt should have failed.');
        if (!firstAttempt.error_message || !firstAttempt.error_message.includes('ReferenceError')) throw new Error('Assertion failed: Error message on first attempt is incorrect.');
        console.log('👍 First attempt validation PASS.');

        if (!secondAttempt.success) throw new Error('Assertion failed: Second attempt should have succeeded.');
        if (secondAttempt.parent_generation_id !== firstAttempt.id) throw new Error('Assertion failed: Second attempt is not linked to the first.');
        console.log('👍 Second attempt validation PASS.');

        console.log('\n🎉 SUCCESS! The auto-correction loop is working perfectly.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
    } finally {
        db.close();
        console.log('\nTest finished. Database connection closed.');
    }
}

runValidationTest();

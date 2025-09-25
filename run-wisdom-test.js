// run-wisdom-test.js
require('dotenv').config();
const db = require('./db.js');
const MetaAI = require('./meta-ai-engine.js');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// --- Task Definitions ---
const factorialTask = {
    name: 'factorial',
    prompt: 'Write a Javascript function named "factorial" that calculates the factorial of a number.',
    functionName: 'factorial',
    testArgs: [5] // We'll test it by calculating 5!
};

const powerTask = {
    name: 'power',
    prompt: 'Write a Javascript function named "power" that calculates x to the power of y.',
    functionName: 'power',
    testArgs: [2, 8] // We'll test it by calculating 2^8
};

// --- Main Execution Logic ---
async function main() {
    if (!DEEPSEEK_API_KEY) {
        return console.error("❌ API Key not found in .env file.");
    }

    try {
        // --- PART 1: TEACH THE AI ---
        console.log("\n--- 👨‍🏫 PART 1: Teaching the AI with 'Factorial' Task ---");
        const metaAi_teacher = new MetaAI({ apiKey: DEEPSEEK_API_KEY, db });
        const factorialResult = await metaAi_teacher.run(factorialTask);

        if (factorialResult.success) {
            console.log("✅ 'Factorial' task succeeded. Wisdom has been saved.");
        } else {
            console.error("❌ 'Factorial' task failed. Cannot proceed with the test.");
            return;
        }

        // --- PART 2: TEST THE AI'S MEMORY ---
        console.log("\n--- 🧠 PART 2: Testing the AI's Memory with 'Power' Task ---");
        const metaAi_student = new MetaAI({ apiKey: DEEPSEEK_API_KEY, db });
        const powerResult = await metaAi_student.run(powerTask);

        if (powerResult.success) {
            console.log("\n--- ✅ Task Complete ---");
            console.log("Final Status: SUCCESS");
            console.log("The AI generated the following 'power' function:");
            console.log("------------------------------------");
            console.log(powerResult.code);
            console.log("------------------------------------");
        } else {
            console.log("\n--- ❌ Task Failed ---");
            console.log("The AI could not produce a working solution for the 'power' task.");
        }

    } catch (error) {
        console.error("An unexpected error occurred:", error);
    }
}

main();
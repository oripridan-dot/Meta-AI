// check-env.js
require('dotenv').config();

console.log("Checking for OPENAI_API_KEY...");
const apiKey = process.env.OPENAI_API_KEY;

if (apiKey) {
    console.log("✅ Success! Key found:", apiKey.substring(0, 7) + "...");
} else {
    console.log("❌ Failure: Key is 'undefined'.");
    console.log("This means the .env file was not found or the variable name is wrong.");
}
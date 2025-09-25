// setup-database.js (Complete Version)
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './meta-ai.sqlite';

console.log('Setting up the database...');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error("Error connecting:", err.message);
    console.log('Connected to the SQLite database file.');
});

db.serialize(() => {
    db.run('DROP TABLE IF EXISTS generations');
    db.run('DROP TABLE IF EXISTS golden_patterns');
    console.log('Ensured no old tables exist.');

    const generationsTableSql = `
    CREATE TABLE generations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_name TEXT NOT NULL,
        generated_code TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        execution_time REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        prompt_used TEXT,
        error_message TEXT,
        parent_generation_id INTEGER
    );`;
    db.run(generationsTableSql, (err) => {
        if (err) return console.error('Error creating generations table:', err.message);
        console.log('✅ "generations" table created successfully.');
    });

    const patternsTableSql = `
    CREATE TABLE golden_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_name TEXT NOT NULL,
        validated_code TEXT NOT NULL,
        performance_score REAL,
        prompt_embedding TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    db.run(patternsTableSql, (err) => {
        if (err) return console.error('Error creating golden_patterns table:', err.message);
        console.log('✅ "golden_patterns" table created successfully.');
    });
});

db.close((err) => {
    if (err) return console.error("Error closing database:", err.message);
    console.log('Database setup complete. Connection closed.');
});

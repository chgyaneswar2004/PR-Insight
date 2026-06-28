import dotenv from 'dotenv';
dotenv.config();

console.log('--- ENV VALUES ---');
console.log('GITHUB_WEBHOOK_SECRET:', process.env.GITHUB_WEBHOOK_SECRET);
console.log('typeof GITHUB_WEBHOOK_SECRET:', typeof process.env.GITHUB_WEBHOOK_SECRET);
console.log('Length:', process.env.GITHUB_WEBHOOK_SECRET ? process.env.GITHUB_WEBHOOK_SECRET.length : 0);

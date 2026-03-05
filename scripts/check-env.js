const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('🔍 Debugging Environment Variables (All Files)...');

const files = ['.env', '.env.dev', '.env.docker'];

files.forEach(file => {
    const filePath = path.join(__dirname, '../', file);
    if (fs.existsSync(filePath)) {
        console.log(`\n📂 Loading ${file}...`);
        const envConfig = dotenv.parse(fs.readFileSync(filePath));

        console.log('   DATABASE_URL_LOCAL:', envConfig.DATABASE_URL_LOCAL || '(not set)');
        console.log('   DATABASE_URL:      ', envConfig.DATABASE_URL || '(not set)');
        console.log('   POSTGRES_USER:     ', envConfig.POSTGRES_USER || '(not set)');
    } else {
        console.log(`\n❌ ${file} not found`);
    }
});

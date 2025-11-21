import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');
const repoUrl = 'https://github.com/tuongtrinhphauthuat/tuongtrinhphauthuat.github.io.git';

console.log('🚀 Starting deployment...');

try {
    // 1. Build the project
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });

    // 2. Navigate to dist directory
    process.chdir(distDir);
    console.log(`📂 Changed directory to ${distDir}`);

    // 3. Initialize git
    console.log('init git...');
    execSync('git init', { stdio: 'inherit' });
    execSync('git checkout -B main', { stdio: 'inherit' }); // Rename branch to main if needed, or use master

    // 4. Add all files
    console.log('➕ Adding files...');
    execSync('git add -A', { stdio: 'inherit' });

    // 5. Commit
    console.log('💾 Committing...');
    execSync('git commit -m "deploy: update site"', { stdio: 'inherit' });

    // 6. Push to target repository
    console.log(`🚀 Pushing to ${repoUrl}...`);
    execSync(`git push -f ${repoUrl} main`, { stdio: 'inherit' });

    console.log('✅ Deployment complete!');
} catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
}

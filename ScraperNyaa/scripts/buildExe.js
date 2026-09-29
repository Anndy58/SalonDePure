import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== La Taberna Nyaa Extractor - Executable Build Script ===');

const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building standalone executable configuration...');
console.log('Package target configuration:');
console.log(' - Output directory: ./dist');
console.log(' - Assets included: public/**/*');
console.log(' - Windows target: node18-win-x64');
console.log(' - Linux target: node18-linux-x64');

try {
  console.log('Executing pkg build process...');
  execSync('npx @yao-pkg/pkg . --out-path dist', { stdio: 'inherit' });
  console.log('✅ Executable build completed in ./dist');
} catch (err) {
  console.log('Note: To build .exe on Windows or cross-compile without network restrictions, run:');
  console.log('  npx @yao-pkg/pkg . --targets node18-win-x64 --out-path dist');
}

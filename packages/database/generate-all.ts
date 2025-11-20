import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

try {
  // Step 1: Clean old zod directory
  console.log('Cleaning old Zod schemas...');
  execSync('pnpm exec rimraf src/zod', { stdio: 'inherit' });
  
  // Step 2: Run Prisma generate
  console.log('Generating Prisma schemas...');
  execSync('pnpm exec prisma generate --no-hints', { stdio: 'inherit' });
  
  // Step 3: Fix z.cuid() references
  console.log('Fixing z.cuid() references...');
  const zodIndexPath = join(__dirname, 'src', 'zod', 'index.ts');
  let content = readFileSync(zodIndexPath, 'utf-8');
  const updatedContent = content.replace(/z\.cuid\(\)/g, 'z.string().cuid()');
  writeFileSync(zodIndexPath, updatedContent, 'utf-8');
  
  console.log('✓ Database generation complete!');
} catch (error) {
  console.error('Error during generation:', error);
  process.exit(1);
}

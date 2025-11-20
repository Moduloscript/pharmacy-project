import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const zodIndexPath = join(__dirname, 'src', 'zod', 'index.ts');

try {
  let content = readFileSync(zodIndexPath, 'utf-8');
  
  // Replace z.cuid() with z.string().cuid()
  const updatedContent = content.replace(/z\.cuid\(\)/g, 'z.string().cuid()');
  
  writeFileSync(zodIndexPath, updatedContent, 'utf-8');
  
  console.log('✓ Fixed z.cuid() references in generated Zod schemas');
} catch (error) {
  console.error('Error fixing Zod schemas:', error);
  process.exit(1);
}

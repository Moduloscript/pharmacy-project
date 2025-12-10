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
  let updatedContent = content.replace(/z\.cuid\(\)/g, 'z.string().cuid()');
  
  // Step 4: Fix DecimalJsLike schema  
  console.log('Fixing DecimalJsLike schema...');
  updatedContent = updatedContent.replace(
    /export const DecimalJsLikeSchema: z\.ZodType<Prisma\.DecimalJsLike> = z\.object\(\{[\s\S]*?\}\)/,
    `export const DecimalJsLikeSchema: z.ZodType<Prisma.DecimalJsLike> = z.object({
  d: z.array(z.number()),
  e: z.number(),
  s: z.number(),
  toFixed: z.function().args().returns(z.string()),
}) as z.ZodType<Prisma.DecimalJsLike>`
  );
  
  writeFileSync(zodIndexPath, updatedContent, 'utf-8');
  
  console.log('✓ Database generation complete!');
} catch (error) {
  console.error('Error during generation:', error);
  process.exit(1);
}

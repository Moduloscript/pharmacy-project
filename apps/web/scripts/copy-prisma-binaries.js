#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const prismaClientPath = path.join(__dirname, '../../../packages/database/src/generated/client');
const standaloneServerPath = path.join(__dirname, '../.next/standalone/packages/database/src/generated/client');

console.log('Copying Prisma binaries to standalone output...');

// Create directory if it doesn't exist
if (!fs.existsSync(standaloneServerPath)) {
  fs.mkdirSync(standaloneServerPath, { recursive: true });
}

// Copy all files from prisma client to standalone
if (fs.existsSync(prismaClientPath)) {
  const files = fs.readdirSync(prismaClientPath);
  files.forEach(file => {
    const srcFile = path.join(prismaClientPath, file);
    const destFile = path.join(standaloneServerPath, file);
    
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied: ${file}`);
    }
  });
  console.log('✓ Prisma binaries copied successfully');
} else {
  console.error('✗ Prisma client path not found:', prismaClientPath);
  process.exit(1);
}

#!/usr/bin/env node

/**
 * Remove console.log statements from production code
 * Keeps console.warn and console.error for important messages
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT_DIR = process.cwd();
const SRC_PATTERN = 'src/**/*.{ts,tsx,js,jsx}';

// Patterns to remove (but keep console.warn and console.error)
const CONSOLE_LOG_PATTERNS = [
  /console\.log\([^)]*\);?\s*/g,
  /console\.debug\([^)]*\);?\s*/g,
  /console\.info\([^)]*\);?\s*/g,
  /console\.trace\([^)]*\);?\s*/g,
];

// Don't remove these (keep for production debugging)
const KEEP_PATTERNS = [
  /console\.warn/g,
  /console\.error/g,
];

function shouldProcessFile(filePath) {
  // Skip test files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return false;
  }
  
  // Skip node_modules
  if (filePath.includes('node_modules')) {
    return false;
  }
  
  return true;
}

function removeConsoleLogs(content) {
  let modified = content;
  let removedCount = 0;
  
  CONSOLE_LOG_PATTERNS.forEach(pattern => {
    const matches = modified.match(pattern);
    if (matches) {
      removedCount += matches.length;
      modified = modified.replace(pattern, '');
    }
  });
  
  // Clean up empty lines created by removal
  modified = modified.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return { content: modified, removedCount };
}

function processFiles() {
  console.log('🧹 Removing console.log statements from production code...');
  
  const files = glob.sync(SRC_PATTERN, { cwd: ROOT_DIR });
  let totalRemoved = 0;
  let filesProcessed = 0;
  
  files.forEach(file => {
    if (!shouldProcessFile(file)) {
      return;
    }
    
    const filePath = path.join(ROOT_DIR, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = removeConsoleLogs(content);
      
      if (result.removedCount > 0) {
        fs.writeFileSync(filePath, result.content, 'utf8');
        console.log(`✅ ${file}: Removed ${result.removedCount} console.log statements`);
        totalRemoved += result.removedCount;
        filesProcessed++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`- Files processed: ${filesProcessed}`);
  console.log(`- Console logs removed: ${totalRemoved}`);
  console.log(`- Console.warn and console.error preserved for production debugging`);
  console.log('✅ Code cleanup completed!');
}

if (require.main === module) {
  processFiles();
}

module.exports = { removeConsoleLogs };
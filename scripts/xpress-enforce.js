#!/usr/bin/env node

/**
 * XPRESS Design System Enforcement Script
 * This script automatically fixes common XPRESS violations where possible
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Common class replacements
const CLASS_REPLACEMENTS = {
  // Color replacements
  'bg-blue-500': 'bg-xpress-500',
  'bg-blue-600': 'bg-xpress-600',
  'text-blue-500': 'text-xpress-500',
  'text-blue-600': 'text-xpress-600',
  'border-blue-500': 'border-xpress-500',
  
  // Semantic color standardization
  'bg-green-500': 'bg-success-500',
  'bg-green-600': 'bg-success-600',
  'text-green-500': 'text-success-500',
  'text-green-600': 'text-success-600',
  
  'bg-red-500': 'bg-danger-500',
  'bg-red-600': 'bg-danger-600',
  'text-red-500': 'text-danger-500',
  'text-red-600': 'text-danger-600',
  
  'bg-yellow-500': 'bg-warning-500',
  'bg-yellow-600': 'bg-warning-600',
  'text-yellow-500': 'text-warning-500',
  'text-yellow-600': 'text-warning-600',
  
  'bg-cyan-500': 'bg-info-500',
  'bg-cyan-600': 'bg-info-600',
  'text-cyan-500': 'text-info-500',
  'text-cyan-600': 'text-info-600',
  
  // Neutral color standardization
  'bg-gray-50': 'bg-neutral-50',
  'bg-gray-100': 'bg-neutral-100',
  'bg-gray-200': 'bg-neutral-200',
  'bg-gray-300': 'bg-neutral-300',
  'bg-gray-400': 'bg-neutral-400',
  'bg-gray-500': 'bg-neutral-500',
  'bg-gray-600': 'bg-neutral-600',
  'bg-gray-700': 'bg-neutral-700',
  'bg-gray-800': 'bg-neutral-800',
  'bg-gray-900': 'bg-neutral-900',
  
  'text-gray-50': 'text-neutral-50',
  'text-gray-100': 'text-neutral-100',
  'text-gray-200': 'text-neutral-200',
  'text-gray-300': 'text-neutral-300',
  'text-gray-400': 'text-neutral-400',
  'text-gray-500': 'text-neutral-500',
  'text-gray-600': 'text-neutral-600',
  'text-gray-700': 'text-neutral-700',
  'text-gray-800': 'text-neutral-800',
  'text-gray-900': 'text-neutral-900',
  
  'border-gray-200': 'border-neutral-200',
  'border-gray-300': 'border-neutral-300',
  
  // Border radius standardization
  'rounded-md': 'rounded-xpress',
  'rounded-lg': 'rounded-xpress-lg',
  'rounded-xl': 'rounded-xpress-xl',
  
  // Shadow standardization
  'shadow-sm': 'shadow-xpress-sm',
  'shadow': 'shadow-xpress',
  'shadow-md': 'shadow-xpress-md',
  'shadow-lg': 'shadow-xpress-lg',
  'shadow-xl': 'shadow-xpress-xl',
};

// Component replacements
const COMPONENT_REPLACEMENTS = [
  {
    pattern: /<button\s+([^>]*?)className="([^"]*?)"([^>]*?)>/g,
    replacement: (match, before, classes, after) => {
      const newClasses = classes
        .split(/\s+/)
        .map(cls => CLASS_REPLACEMENTS[cls] || cls)
        .join(' ');
      
      // If it looks like a basic button, suggest XPRESS Button
      if (classes.includes('bg-') && classes.includes('text-') && classes.includes('px-') && classes.includes('py-')) {
        return `{/* TODO: Consider using XPRESS Button component */}\n<button ${before}className="${newClasses}"${after}>`;
      }
      
      return `<button ${before}className="${newClasses}"${after}>`;
    }
  },
  {
    pattern: /<div\s+([^>]*?)className="([^"]*?)"([^>]*?)>/g,
    replacement: (match, before, classes, after) => {
      const newClasses = classes
        .split(/\s+/)
        .map(cls => CLASS_REPLACEMENTS[cls] || cls)
        .join(' ');
      
      // If it looks like a card, suggest XPRESS Card
      if (classes.includes('bg-white') && classes.includes('shadow') && classes.includes('rounded')) {
        return `{/* TODO: Consider using XPRESS Card component */}\n<div ${before}className="${newClasses}"${after}>`;
      }
      
      return `<div ${before}className="${newClasses}"${after}>`;
    }
  },
  {
    pattern: /<span\s+([^>]*?)className="([^"]*?)"([^>]*?)>/g,
    replacement: (match, before, classes, after) => {
      const newClasses = classes
        .split(/\s+/)
        .map(cls => CLASS_REPLACEMENTS[cls] || cls)
        .join(' ');
      
      // If it looks like a badge, suggest XPRESS Badge
      if (classes.includes('inline-flex') && classes.includes('px-') && classes.includes('py-') && classes.includes('rounded')) {
        return `{/* TODO: Consider using XPRESS Badge component */}\n<span ${before}className="${newClasses}"${after}>`;
      }
      
      return `<span ${before}className="${newClasses}"${after}>`;
    }
  }
];

class XpressEnforcer {
  constructor() {
    this.changedFiles = [];
    this.suggestions = [];
  }

  async enforceFiles() {
    console.log('🔧 Enforcing XPRESS Design System compliance...\n');

    try {
      // Find all TypeScript/React files
      const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
        ignore: ['node_modules/**', '.next/**', 'out/**', '**/xpress/**'],
      });

      for (const file of files) {
        await this.enforceFile(file);
      }

      this.printResults();
      return true;
    } catch (error) {
      console.error('❌ Error enforcing files:', error);
      return false;
    }
  }

  async enforceFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let content = originalContent;
      let hasChanges = false;

      // Apply class replacements
      Object.entries(CLASS_REPLACEMENTS).forEach(([oldClass, newClass]) => {
        const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
        const newContent = content.replace(regex, newClass);
        if (newContent !== content) {
          hasChanges = true;
          content = newContent;
        }
      });

      // Apply component replacements
      COMPONENT_REPLACEMENTS.forEach(({ pattern, replacement }) => {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          hasChanges = true;
          content = newContent;
        }
      });

      // Remove inline styles (with warning comment)
      const inlineStyleRegex = /style\s*=\s*\{[^}]*\}/g;
      if (inlineStyleRegex.test(content)) {
        content = content.replace(inlineStyleRegex, '{/* TODO: Replace inline style with XPRESS classes */}');
        hasChanges = true;
      }

      // Write back if changed
      if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.changedFiles.push(filePath);
      }

      // Check for component suggestions
      this.checkForComponentSuggestions(content, filePath);

    } catch (error) {
      console.error(`❌ Error enforcing ${filePath}:`, error.message);
    }
  }

  checkForComponentSuggestions(content, filePath) {
    const suggestions = [];

    // Check for button patterns
    if (content.includes('<button') && !content.includes('from \'@/components/xpress\'')) {
      suggestions.push('Consider using XPRESS Button component');
    }

    // Check for card patterns
    if (content.match(/bg-white.*shadow.*rounded/s) && !content.includes('from \'@/components/xpress\'')) {
      suggestions.push('Consider using XPRESS Card component');
    }

    // Check for badge patterns
    if (content.match(/inline-flex.*px-.*py-.*rounded/s) && !content.includes('from \'@/components/xpress\'')) {
      suggestions.push('Consider using XPRESS Badge component');
    }

    if (suggestions.length > 0) {
      this.suggestions.push({ filePath, suggestions });
    }
  }

  printResults() {
    console.log('\n📊 XPRESS Enforcement Results:\n');

    if (this.changedFiles.length === 0 && this.suggestions.length === 0) {
      console.log('✅ No changes needed - all files are already XPRESS compliant! 🎉\n');
      return;
    }

    if (this.changedFiles.length > 0) {
      console.log('🔧 FIXED FILES:');
      this.changedFiles.forEach(filePath => {
        console.log(`  ✅ ${filePath}`);
      });
      console.log('');
    }

    if (this.suggestions.length > 0) {
      console.log('💡 SUGGESTIONS:');
      this.suggestions.forEach(({ filePath, suggestions }) => {
        console.log(`  📄 ${filePath}:`);
        suggestions.forEach(suggestion => {
          console.log(`    → ${suggestion}`);
        });
      });
      console.log('');
    }

    console.log(`Summary: ${this.changedFiles.length} files fixed, ${this.suggestions.length} files with suggestions\n`);

    if (this.changedFiles.length > 0) {
      console.log('✅ XPRESS enforcement completed successfully!\n');
      console.log('📝 Next steps:');
      console.log('  - Review the changes made to your files');
      console.log('  - Address any TODO comments that were added');
      console.log('  - Consider using XPRESS components for better consistency');
      console.log('  - Run `npm run xpress:check` to verify compliance\n');
    }
  }
}

// CLI execution
if (require.main === module) {
  const enforcer = new XpressEnforcer();
  
  enforcer.enforceFiles().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = XpressEnforcer;
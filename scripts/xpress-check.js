#!/usr/bin/env node

/**
 * XPRESS Design System Enforcement Script
 * This script checks that only XPRESS design system classes and components are used
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// XPRESS allowed class prefixes
const ALLOWED_CLASS_PREFIXES = [
  'xpress-',
  // Tailwind utility classes that are part of XPRESS
  'bg-', 'text-', 'border-', 'rounded-',
  'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-',
  'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
  'w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-',
  'flex', 'grid', 'block', 'inline', 'hidden',
  'absolute', 'relative', 'fixed', 'sticky',
  'top-', 'bottom-', 'left-', 'right-',
  'z-', 'opacity-', 'shadow-',
  'transition-', 'duration-', 'ease-',
  'hover:', 'focus:', 'active:', 'disabled:',
  'sm:', 'md:', 'lg:', 'xl:', '2xl:',
  // XPRESS semantic colors
  'neutral-', 'success-', 'warning-', 'danger-', 'info-',
  // XPRESS animations
  'animate-', 'transform', 'scale-', 'rotate-', 'translate-',
  // Layout utilities
  'container', 'mx-auto', 'gap-', 'space-', 'divide-',
  'overflow-', 'truncate', 'break-',
];

// Forbidden patterns
const FORBIDDEN_PATTERNS = [
  /style\s*=\s*["{']/, // Inline styles
  /className\s*=\s*["`'].*[^a-zA-Z0-9\s\-:._]/, // Non-standard class names
  /tw-/, // Tailwind arbitrary values
  /\[[^\]]*\]/, // Arbitrary value syntax like w-[100px]
];

// XPRESS required imports for components
const REQUIRED_XPRESS_IMPORTS = [
  '@/components/xpress',
  './xpress',
  '../xpress',
];

class XpressChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async checkFiles() {
    console.log('🔍 Checking XPRESS Design System compliance...\n');

    try {
      // Find all TypeScript/React files
      const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
        ignore: ['node_modules/**', '.next/**', 'out/**'],
      });

      for (const file of files) {
        await this.checkFile(file);
      }

      this.printResults();
      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Error checking files:', error);
      return false;
    }
  }

  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Skip XPRESS component files themselves
      if (filePath.includes('/xpress/')) {
        return;
      }

      lines.forEach((line, index) => {
        this.checkLine(line, filePath, index + 1);
      });

      // Check for XPRESS imports in component files
      if (this.isComponentFile(filePath, content)) {
        this.checkXpressImports(content, filePath);
      }
    } catch (error) {
      this.addError(filePath, 1, `Could not read file: ${error.message}`);
    }
  }

  checkLine(line, filePath, lineNumber) {
    // Check for forbidden patterns
    FORBIDDEN_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        this.addError(
          filePath,
          lineNumber,
          `Forbidden pattern detected: ${line.trim()}`
        );
      }
    });

    // Check className values
    const classNameMatch = line.match(/className\s*=\s*["`']([^"`']*)["`']/);
    if (classNameMatch) {
      const classes = classNameMatch[1].split(/\s+/).filter(Boolean);
      classes.forEach(cls => {
        if (!this.isAllowedClass(cls)) {
          this.addError(
            filePath,
            lineNumber,
            `Non-XPRESS class detected: "${cls}". Use XPRESS Design System classes only.`
          );
        }
      });
    }

    // Check for template literal classNames
    const templateMatch = line.match(/className\s*=\s*[`{]/);
    if (templateMatch) {
      this.addWarning(
        filePath,
        lineNumber,
        'Dynamic className detected. Ensure all classes are from XPRESS Design System.'
      );
    }
  }

  isAllowedClass(className) {
    // Handle conditional classes like hover:bg-blue-500
    const baseClass = className.includes(':') 
      ? className.split(':').pop() 
      : className;

    return ALLOWED_CLASS_PREFIXES.some(prefix => {
      if (prefix.endsWith('-')) {
        return className.startsWith(prefix);
      }
      return className === prefix || className.startsWith(prefix + '-') || className.startsWith(prefix + ':');
    });
  }

  isComponentFile(filePath, content) {
    // Check if file contains React components
    return (
      filePath.endsWith('.tsx') ||
      (filePath.endsWith('.jsx') && content.includes('React'))
    ) && content.includes('export');
  }

  checkXpressImports(content, filePath) {
    // Skip if it's a non-component file
    if (!content.includes('function') && !content.includes('const') && !content.includes('class')) {
      return;
    }

    // Check if file uses JSX
    if (!content.includes('jsx') && !/<[A-Z]/.test(content)) {
      return;
    }

    const hasXpressImport = REQUIRED_XPRESS_IMPORTS.some(importPath => 
      content.includes(`from '${importPath}'`) || 
      content.includes(`from "${importPath}"`)
    );

    const hasUIElements = /className|<(div|span|button|input|form)/.test(content);

    if (hasUIElements && !hasXpressImport && !filePath.includes('/xpress/')) {
      this.addWarning(
        filePath,
        1,
        'Consider using XPRESS components instead of raw HTML elements.'
      );
    }
  }

  addError(filePath, lineNumber, message) {
    this.errors.push({ filePath, lineNumber, message, type: 'error' });
  }

  addWarning(filePath, lineNumber, message) {
    this.warnings.push({ filePath, lineNumber, message, type: 'warning' });
  }

  printResults() {
    console.log('\n📊 XPRESS Compliance Check Results:\n');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All files are XPRESS compliant! 🎉\n');
      return;
    }

    if (this.errors.length > 0) {
      console.log('❌ ERRORS (must be fixed):');
      this.errors.forEach(({ filePath, lineNumber, message }) => {
        console.log(`  ${filePath}:${lineNumber} - ${message}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS (recommendations):');
      this.warnings.forEach(({ filePath, lineNumber, message }) => {
        console.log(`  ${filePath}:${lineNumber} - ${message}`);
      });
      console.log('');
    }

    console.log(`Summary: ${this.errors.length} errors, ${this.warnings.length} warnings\n`);

    if (this.errors.length > 0) {
      console.log('❌ XPRESS compliance check FAILED. Please fix the errors above.\n');
      console.log('💡 Tips:');
      console.log('  - Use XPRESS components from @/components/xpress');
      console.log('  - Use only XPRESS design tokens and utility classes');
      console.log('  - Avoid inline styles and arbitrary values');
      console.log('  - Check the XPRESS documentation for approved patterns\n');
    } else {
      console.log('✅ XPRESS compliance check PASSED with warnings.\n');
    }
  }
}

// CLI execution
if (require.main === module) {
  const checker = new XpressChecker();
  
  checker.checkFiles().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = XpressChecker;
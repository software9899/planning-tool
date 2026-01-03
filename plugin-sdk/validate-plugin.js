#!/usr/bin/env node

/**
 * Planning Tool Plugin Validator
 * Validates plugin structure and configuration
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

class PluginValidator {
  constructor(pluginPath) {
    this.pluginPath = pluginPath;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(message, type = 'info') {
    switch (type) {
      case 'error':
        console.log(`${colors.red}❌ ${message}${colors.reset}`);
        this.errors.push(message);
        break;
      case 'warning':
        console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
        this.warnings.push(message);
        break;
      case 'success':
        console.log(`${colors.green}✅ ${message}${colors.reset}`);
        break;
      default:
        console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
        this.info.push(message);
    }
  }

  validate() {
    console.log(`\n${colors.blue}🔍 Validating plugin: ${this.pluginPath}${colors.reset}\n`);

    this.checkDirectory();
    this.checkPluginJson();
    this.checkRequiredFiles();
    this.checkFileContents();

    this.printSummary();

    return this.errors.length === 0;
  }

  checkDirectory() {
    if (!fs.existsSync(this.pluginPath)) {
      this.log(`Plugin directory not found: ${this.pluginPath}`, 'error');
      return false;
    }

    if (!fs.statSync(this.pluginPath).isDirectory()) {
      this.log(`Path is not a directory: ${this.pluginPath}`, 'error');
      return false;
    }

    this.log('Plugin directory exists', 'success');
    return true;
  }

  checkPluginJson() {
    const jsonPath = path.join(this.pluginPath, 'plugin.json');

    if (!fs.existsSync(jsonPath)) {
      this.log('plugin.json not found', 'error');
      return false;
    }

    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const config = JSON.parse(content);

      // Required fields
      const requiredFields = ['id', 'name', 'version', 'description', 'main'];
      for (const field of requiredFields) {
        if (!config[field]) {
          this.log(`Missing required field in plugin.json: ${field}`, 'error');
        }
      }

      // Validate ID format
      if (config.id && !/^[a-z0-9-]+$/.test(config.id)) {
        this.log('Plugin ID should be lowercase with dashes only', 'warning');
      }

      // Validate version format
      if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
        this.log('Version should follow semantic versioning (e.g., 1.0.0)', 'warning');
      }

      // Check optional but recommended fields
      if (!config.author) {
        this.log('Author field is recommended', 'warning');
      }

      if (!config.icon) {
        this.log('Icon field is recommended', 'warning');
      }

      this.log('plugin.json is valid', 'success');
      return true;

    } catch (error) {
      this.log(`plugin.json parse error: ${error.message}`, 'error');
      return false;
    }
  }

  checkRequiredFiles() {
    const jsonPath = path.join(this.pluginPath, 'plugin.json');

    if (!fs.existsSync(jsonPath)) {
      return false;
    }

    const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const mainFile = config.main || 'index.html';
    const mainPath = path.join(this.pluginPath, mainFile);

    if (!fs.existsSync(mainPath)) {
      this.log(`Main file not found: ${mainFile}`, 'error');
    } else {
      this.log(`Main file exists: ${mainFile}`, 'success');
    }

    // Check for style.css
    const cssPath = path.join(this.pluginPath, 'style.css');
    if (!fs.existsSync(cssPath)) {
      this.log('style.css not found (optional but recommended)', 'warning');
    } else {
      this.log('style.css exists', 'success');
    }

    // Check for script.js
    const jsPath = path.join(this.pluginPath, 'script.js');
    if (!fs.existsSync(jsPath)) {
      this.log('script.js not found (optional but recommended)', 'warning');
    } else {
      this.log('script.js exists', 'success');
    }

    return true;
  }

  checkFileContents() {
    const htmlPath = path.join(this.pluginPath, 'index.html');

    if (fs.existsSync(htmlPath)) {
      const content = fs.readFileSync(htmlPath, 'utf8');

      // Check for DOCTYPE
      if (!content.includes('<!DOCTYPE html>')) {
        this.log('HTML should include DOCTYPE declaration', 'warning');
      }

      // Check for viewport meta tag
      if (!content.includes('viewport')) {
        this.log('HTML should include viewport meta tag for responsive design', 'warning');
      }

      // Check for UTF-8 charset
      if (!content.includes('charset="UTF-8"') && !content.includes("charset='UTF-8'")) {
        this.log('HTML should specify UTF-8 charset', 'warning');
      }
    }

    return true;
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.blue}📊 Validation Summary${colors.reset}`);
    console.log('='.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}✅ All checks passed! Plugin is valid.${colors.reset}`);
    } else {
      if (this.errors.length > 0) {
        console.log(`${colors.red}❌ Errors: ${this.errors.length}${colors.reset}`);
      }
      if (this.warnings.length > 0) {
        console.log(`${colors.yellow}⚠️  Warnings: ${this.warnings.length}${colors.reset}`);
      }
    }

    console.log('='.repeat(50) + '\n');
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
${colors.blue}Planning Tool Plugin Validator${colors.reset}

Usage:
  node validate-plugin.js <plugin-path>

Example:
  node validate-plugin.js ../plugins/my-plugin
    `);
    process.exit(1);
  }

  const pluginPath = args[0];
  const validator = new PluginValidator(pluginPath);
  const isValid = validator.validate();

  process.exit(isValid ? 0 : 1);
}

module.exports = PluginValidator;

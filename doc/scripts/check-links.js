#!/usr/bin/env node

/**
 * Link checker for documentation
 * Validates all internal markdown links to catch broken references
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
const errors = [];

function findMarkdownFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function findFileById(id) {
  const files = findMarkdownFiles(DOCS_DIR);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const idMatch = content.match(/^---\s*\nid:\s*([^\s\n]+)/m);
      if (idMatch && idMatch[1] === id) {
        return file;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return null;
}

function checkLinks(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(DOCS_DIR, filePath);
  let match;
  
  linkRegex.lastIndex = 0;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const [, text, link] = match;
    
    // Skip external links, anchors, and special protocols
    if (link.startsWith('http://') || 
        link.startsWith('https://') || 
        link.startsWith('#') ||
        link.startsWith('mailto:')) {
      continue;
    }
    
    // Resolve relative paths
    const fileDir = path.dirname(filePath);
    let targetPath = path.resolve(fileDir, link.split('#')[0]);
    let linkExists = false;
    
    // Check if file exists, if not try adding .md extension
    if (fs.existsSync(targetPath)) {
      linkExists = true;
    } else {
      const targetWithMd = targetPath + '.md';
      if (fs.existsSync(targetWithMd)) {
        targetPath = targetWithMd;
        linkExists = true;
      } else {
        const targetWithMdx = targetPath + '.mdx';
        if (fs.existsSync(targetWithMdx)) {
          targetPath = targetWithMdx;
          linkExists = true;
        } else {
          // Try to find by ID if it's not a relative path
          const linkBase = link.split('#')[0];
          if (!linkBase.includes('/') && !linkBase.startsWith('.')) {
            const fileById = findFileById(linkBase);
            if (fileById) {
              linkExists = true;
            }
          }
        }
      }
    }
    
    if (!linkExists) {
      errors.push({
        file: relativePath,
        link,
        text,
      });
    }
  }
}

function main() {
  console.log('🔍 Checking documentation links...\n');
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error('❌ Docs directory not found:', DOCS_DIR);
    process.exit(1);
  }
  
  const files = findMarkdownFiles(DOCS_DIR);
  console.log(`Found ${files.length} markdown files\n`);
  
  files.forEach(checkLinks);
  
  if (errors.length === 0) {
    console.log('✅ All links are valid!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} broken link(s):\n`);
    errors.forEach(({ file, link, text }) => {
      console.log(`  ${file}`);
      console.log(`    Link: ${link}`);
      console.log(`    Text: "${text}"`);
      console.log('');
    });
    process.exit(1);
  }
}

main();

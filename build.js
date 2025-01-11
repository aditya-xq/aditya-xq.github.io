import { minify } from 'html-minifier';
import fs from 'fs';
import path from 'path';

// Paths
const SRC_DIR = './src';
const DIST_DIR = './dist';
const CSS_SOURCE = './node_modules/altcss/alt.min.css';
const CSS_DEST = path.join(DIST_DIR, 'alt.min.css');

// Step 1: Clean the output directory
fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR);

// Step 2: Optimize and Copy HTML
const htmlPath = path.join(SRC_DIR, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
const minifiedHTML = minify(htmlContent, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
});
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), minifiedHTML);

// Step 3: Copy CSS from node_modules
fs.copyFileSync(CSS_SOURCE, CSS_DEST);

console.log('Build completed successfully!');

import { minify } from 'html-minifier'
import fs from 'fs'
import path from 'path'

// Paths
const SRC_DIR = './src'
const DIST_DIR = './dist'
const CSS_SOURCE = './node_modules/altcss/alt.min.css'
const CSS_DEST = path.join(DIST_DIR, 'alt.min.css')
const ASSETS_SOURCE = path.join(SRC_DIR, 'assets')
const ASSETS_DEST = path.join(DIST_DIR, 'assets')
const TERMINAL_SOURCE = path.join(SRC_DIR, 'terminal', 'dist')
const TERMINAL_DEST = path.join(DIST_DIR, 'terminal')

// Step 1: Clean the output directory
fs.rmSync(DIST_DIR, { recursive: true, force: true })
fs.mkdirSync(DIST_DIR)
fs.mkdirSync(ASSETS_DEST)

// Step 2: Optimize and Copy HTML
const htmlPath = path.join(SRC_DIR, 'index.html')
const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
const minifiedHTML = minify(htmlContent, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
})
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), minifiedHTML)

// Step 3: Copy CSS from node_modules
fs.copyFileSync(CSS_SOURCE, CSS_DEST)

// Step 4: Copy assets
fs.cpSync(ASSETS_SOURCE, ASSETS_DEST, { recursive: true })

// Step 5: Copy terminal dist folder
fs.cpSync(TERMINAL_SOURCE, TERMINAL_DEST, { recursive: true })

console.log('Build completed successfully!')

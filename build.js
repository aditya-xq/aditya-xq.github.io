import { minify } from 'html-minifier-terser'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash } from 'crypto'

// Paths
const SRC_DIR = './src'
const DIST_DIR = './dist'
const CSS_SOURCE = './node_modules/altcss/alt.min.css'
const ASSETS_SOURCE = path.join(SRC_DIR, 'assets')
const ASSETS_DEST = path.join(DIST_DIR, 'assets')
const TERMINAL_SOURCE = path.join(SRC_DIR, 'terminal', 'dist')
const TERMINAL_DEST = path.join(DIST_DIR, 'terminal')

// Preserve the previously built terminal bundle when its source is unavailable
// (e.g. a fresh clone or CI checkout where src/terminal is gitignored).
const hasTerminalSource = fs.existsSync(TERMINAL_SOURCE)
let preservedTerminal = null
if (!hasTerminalSource && fs.existsSync(TERMINAL_DEST)) {
  preservedTerminal = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-'))
  fs.cpSync(TERMINAL_DEST, preservedTerminal, { recursive: true })
}

// Step 1: Clean the output directory
fs.rmSync(DIST_DIR, { recursive: true, force: true })
fs.mkdirSync(DIST_DIR, { recursive: true })
fs.mkdirSync(ASSETS_DEST, { recursive: true })

// Step 2: Copy and cache-bust the CSS
const cssContent = fs.readFileSync(CSS_SOURCE)
const cssHash = createHash('md5').update(cssContent).digest('hex').slice(0, 8)
const cssFileName = `alt.${cssHash}.min.css`
fs.writeFileSync(path.join(DIST_DIR, cssFileName), cssContent)

// Step 3: Optimize and copy HTML
const htmlPath = path.join(SRC_DIR, 'index.html')
const htmlContent = fs
  .readFileSync(htmlPath, 'utf-8')
  .replace('href="alt.min.css"', `href="${cssFileName}"`)
const minifiedHTML = await minify(htmlContent, {
  collapseWhitespace: true,
  removeComments: true,
  removeAttributeQuotes: true,
  collapseBooleanAttributes: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
  sortAttributes: true,
})
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), minifiedHTML)

// Step 4: Copy root-level static files
for (const file of ['robots.txt']) {
  const src = path.join(SRC_DIR, file)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST_DIR, file))
}

// Step 4b: Generate sitemap.xml with the current build date
const today = new Date().toISOString().slice(0, 10)
const BASE_URL = 'https://aditya-xq.github.io'
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/terminal/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap)

// Step 5: Copy assets
fs.cpSync(ASSETS_SOURCE, ASSETS_DEST, { recursive: true })

// Step 6: Copy (or preserve) the terminal build
if (hasTerminalSource) {
  fs.cpSync(TERMINAL_SOURCE, TERMINAL_DEST, { recursive: true })
} else if (preservedTerminal) {
  fs.cpSync(preservedTerminal, TERMINAL_DEST, { recursive: true })
  fs.rmSync(preservedTerminal, { recursive: true, force: true })
} else {
  console.warn('No terminal source or existing build found; skipping /terminal')
}

console.log('Build completed successfully!')

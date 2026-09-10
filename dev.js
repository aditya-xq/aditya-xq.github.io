import fs from 'fs'
import path from 'path'

const ROOT = import.meta.dir
const DIST = path.join(ROOT, 'dist')

const args = process.argv.slice(2)
const noWatch = args.includes('--no-watch')
const portArg = args.find(a => a.startsWith('--port='))
const PORT = portArg ? Number(portArg.split('=')[1]) : 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

const RELOAD_SCRIPT =
  '<script>(function(){try{var s=new EventSource("/__dev_reload");' +
  's.onmessage=function(){location.reload()}}catch(e){}})()</script>'

function runBuild() {
  const proc = Bun.spawnSync({
    cmd: [process.execPath, 'build.js'],
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  return proc.exitCode === 0
}

function safeResolve(pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const target = path.resolve(DIST, '.' + decoded)
  if (target !== DIST && !target.startsWith(DIST + path.sep)) return null
  return target
}

async function sendFile(filePath) {
  const file = Bun.file(filePath)
  const headers = {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || file.type,
    'Cache-Control': 'no-store',
  }
  if (filePath.endsWith('.html')) {
    const html = await file.text()
    const body = html.includes('</body>')
      ? html.replace('</body>', RELOAD_SCRIPT + '</body>')
      : html + RELOAD_SCRIPT
    return new Response(body, { headers })
  }
  return new Response(file, { headers })
}

async function serveStatic(pathname) {
  const target = safeResolve(pathname)
  if (!target) return new Response('Forbidden', { status: 403 })

  let stat
  try {
    stat = fs.statSync(target)
  } catch {
    stat = null
  }

  if (stat?.isFile()) return sendFile(target)

  // Directories must keep a trailing slash so relative asset URLs resolve,
  // matching GitHub Pages behaviour.
  if (stat?.isDirectory()) {
    if (!pathname.endsWith('/')) {
      return new Response(null, {
        status: 301,
        headers: { Location: pathname + '/' },
      })
    }
    const index = path.join(target, 'index.html')
    if (fs.existsSync(index)) return sendFile(index)
    return new Response('Not Found', { status: 404 })
  }

  // Clean URL fallback (e.g. /some-page -> /some-page/index.html)
  if (!path.extname(target)) {
    const index = path.join(target, 'index.html')
    if (fs.existsSync(index)) return sendFile(index)
  }
  return new Response('Not Found', { status: 404 })
}

// ---- Live reload (Server-Sent Events) ----
const clients = new Set()
const encoder = new TextEncoder()

function broadcast() {
  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode('data: reload\n\n'))
    } catch {
      clients.delete(controller)
    }
  }
}

function sseResponse() {
  let heartbeat
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller)
      controller.enqueue(encoder.encode(': connected\n\n'))
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(heartbeat)
          clients.delete(controller)
        }
      }, 15000)
    },
    cancel() {
      clearInterval(heartbeat)
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// ---- Watch + rebuild ----
let building = false
let debounceTimer

async function rebuild() {
  if (building) return
  building = true
  const proc = Bun.spawn({
    cmd: [process.execPath, 'build.js'],
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  building = false
  if (code === 0) {
    console.log('[dev] rebuilt - reloading browser')
    broadcast()
  } else {
    console.error('[dev] build failed - keeping previous output')
  }
}

function scheduleRebuild() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(rebuild, 120)
}

const WATCH_PATHS = [
  path.join(ROOT, 'build.js'),
  path.join(ROOT, 'src', 'index.html'),
  path.join(ROOT, 'src', 'assets'),
  path.join(ROOT, 'src', 'robots.txt'),
  path.join(ROOT, 'src', 'sitemap.xml'),
  path.join(ROOT, 'src', 'terminal', 'dist'),
  path.join(ROOT, 'node_modules', 'altcss', 'alt.min.css'),
]

function startWatching() {
  for (const p of WATCH_PATHS) {
    if (!fs.existsSync(p)) continue
    const isDir = fs.statSync(p).isDirectory()
    try {
      fs.watch(p, { recursive: isDir }, (_event, filename) => {
        if (filename && /(~$|\.tmp$|\.swp$)/.test(filename)) return
        scheduleRebuild()
      })
    } catch (err) {
      console.warn(`Could not watch ${p}: ${err.message}`)
    }
  }
  console.log('[dev] watching for changes (Ctrl+C to stop)')
}

console.log('[dev] building...')
if (!runBuild()) {
  console.error('[dev] initial build failed. Fix the error and run again.')
  process.exit(1)
}

Bun.serve({
  port: PORT,
  hostname: 'localhost',
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/__dev_reload') return sseResponse()
    return serveStatic(url.pathname)
  },
})

console.log(`\n  Main site:  http://localhost:${PORT}/`)
console.log(`  Terminal:   http://localhost:${PORT}/terminal/\n`)

if (!noWatch) startWatching()

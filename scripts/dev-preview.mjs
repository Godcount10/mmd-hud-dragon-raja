import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { closeSync, copyFileSync, mkdirSync, openSync, readSync, statSync } from 'node:fs'

const BUILD_ID = process.env.MMD_HUD_BUILD_ID || 'dragon-raja-local-preview'
const FRAME_OUTPUT_DIR = resolve(process.env.MMD_HUD_FRAME_OUT_DIR || 'tmp/dev-preview/frame')
const DEFAULT_POSTER_PATH = resolve(
  'output/imagegen/dragon-raja-live-1866e90d-local-refined/ritual-refined.png',
)
const DEFAULT_CREST_PATH = resolve('缓存/image-1787581608135.jpg')
const DEFAULT_BRUSH_FONT_PATH = resolve('src/hud/themes/dragon-raja/assets/ma-shan-zheng-dragon-raja.ttf')
const MEDIA_OUTPUT_DIR = resolve('tmp/dev-preview/media')

const viteBin = resolve('node_modules/vite/bin/vite.js')
const children = new Set()
let shuttingDown = false

function isLikelyImage(filePath) {
  let fd
  try {
    const info = statSync(filePath)
    if (!info.isFile() || info.size < 1024) return false
    fd = openSync(filePath, 'r')
    const header = Buffer.alloc(8)
    readSync(fd, header, 0, header.length, 0)
    const png = header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    const jpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
    return png || jpeg
  } catch {
    return false
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

function isLikelyFont(filePath) {
  try {
    const info = statSync(filePath)
    return info.isFile() && info.size >= 1024
  } catch {
    return false
  }
}

function parsePort(value, fallback) {
  const port = Number(value ?? fallback)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback
}

function canListen(port) {
  return new Promise((resolvePort) => {
    const server = createServer()
    server.once('error', () => resolvePort(false))
    server.once('listening', () => {
      server.close(() => resolvePort(true))
    })
    server.listen(port, '127.0.0.1')
  })
}

async function findOpenPort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await canListen(port)) return port
  }
  throw new Error(`No open port found from ${startPort} to ${startPort + 49}`)
}

function runOnce(command, args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: 'inherit', env })
    child.on('error', rejectRun)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolveRun()
        return
      }
      rejectRun(new Error(`${command} ${args.join(' ')} failed with ${signal ?? code}`))
    })
  })
}

function start(name, command, args, env) {
  const child = spawn(command, args, { stdio: 'inherit', env })
  children.add(child)
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (!shuttingDown && code !== 0) {
      console.error(`[dev:preview] ${name} exited with ${signal ?? code}`)
      stopAll()
      process.exitCode = typeof code === 'number' ? code : 1
    }
  })
  child.on('error', (error) => {
    if (!shuttingDown) {
      console.error(`[dev:preview] ${name} failed:`, error)
      stopAll()
      process.exitCode = 1
    }
  })
  return child
}

function stopAll() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    child.kill()
  }
}

process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)
process.on('exit', stopAll)

const env = {
  ...process.env,
  MMD_HUD_BUILD_ID: BUILD_ID,
  MMD_HUD_FRAME_OUT_DIR: FRAME_OUTPUT_DIR,
  VITE_MMD_HUD_BUILD_ID: BUILD_ID,
}

const framePort = await findOpenPort(parsePort(process.env.MMD_HUD_FRAME_PORT, 5273))
const hostPort = await findOpenPort(parsePort(process.env.MMD_HUD_HOST_PORT, 5174))
const posterPort = await findOpenPort(parsePort(process.env.DRAGON_RAJA_POSTER_PORT, 5373))

env.VITE_MMD_HUD_DEV_FRAME_SCRIPT_URL = `http://127.0.0.1:${framePort}/mmd-hud-iframe-frame.js`

const shouldServeDefaultPoster = !env.DRAGON_RAJA_WELCOME_POSTER_URL && isLikelyImage(DEFAULT_POSTER_PATH)
const shouldServeDefaultCrest = !env.DRAGON_RAJA_CASSELL_CREST_URL && isLikelyImage(DEFAULT_CREST_PATH)
const shouldServeDefaultBrushFont = !env.DRAGON_RAJA_BRUSH_FONT_URL && isLikelyFont(DEFAULT_BRUSH_FONT_PATH)
if (shouldServeDefaultPoster || shouldServeDefaultCrest || shouldServeDefaultBrushFont) mkdirSync(MEDIA_OUTPUT_DIR, { recursive: true })
if (shouldServeDefaultPoster) {
  copyFileSync(DEFAULT_POSTER_PATH, resolve(MEDIA_OUTPUT_DIR, 'ritual-refined.png'))
  env.DRAGON_RAJA_WELCOME_POSTER_URL = `http://127.0.0.1:${posterPort}/ritual-refined.png`
}
if (shouldServeDefaultCrest) {
  copyFileSync(DEFAULT_CREST_PATH, resolve(MEDIA_OUTPUT_DIR, 'cassell-college-crest.jpg'))
  env.DRAGON_RAJA_CASSELL_CREST_URL = `http://127.0.0.1:${posterPort}/cassell-college-crest.jpg`
}
if (shouldServeDefaultBrushFont) {
  copyFileSync(DEFAULT_BRUSH_FONT_PATH, resolve(MEDIA_OUTPUT_DIR, 'ma-shan-zheng-dragon-raja.ttf'))
  env.DRAGON_RAJA_BRUSH_FONT_URL = `http://127.0.0.1:${posterPort}/ma-shan-zheng-dragon-raja.ttf`
}

console.log(`[dev:preview] Build ID: ${BUILD_ID}`)
console.log(`[dev:preview] Frame output: ${FRAME_OUTPUT_DIR}`)
if (env.DRAGON_RAJA_WELCOME_POSTER_URL) {
  console.log(`[dev:preview] Poster URL: ${env.DRAGON_RAJA_WELCOME_POSTER_URL}`)
}
if (env.DRAGON_RAJA_CASSELL_CREST_URL) {
  console.log(`[dev:preview] Cassell crest URL: ${env.DRAGON_RAJA_CASSELL_CREST_URL}`)
}
if (env.DRAGON_RAJA_BRUSH_FONT_URL) {
  console.log(`[dev:preview] Brush font URL: ${env.DRAGON_RAJA_BRUSH_FONT_URL}`)
}

await runOnce(process.execPath, [viteBin, 'build', '--config', 'vite.frame.config.ts'], env)

start('frame-assets', process.execPath, ['scripts/serve-cors.mjs', FRAME_OUTPUT_DIR, String(framePort)], env)

if (shouldServeDefaultPoster || shouldServeDefaultCrest || shouldServeDefaultBrushFont) {
  start('media-assets', process.execPath, ['scripts/serve-cors.mjs', MEDIA_OUTPUT_DIR, String(posterPort)], env)
}

start('frame-watch', process.execPath, [viteBin, 'build', '--config', 'vite.frame.config.ts', '--watch'], env)
start('host', process.execPath, [viteBin, '--config', 'vite.host-dev.config.ts', '--host', '127.0.0.1', '--port', String(hostPort)], env)

console.log(`[dev:preview] Frame URL: ${env.VITE_MMD_HUD_DEV_FRAME_SCRIPT_URL}`)
console.log(`[dev:preview] Open http://127.0.0.1:${hostPort}/`)

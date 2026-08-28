import http from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, isAbsolute, relative as relativePath, resolve } from 'node:path'

const root = resolve(process.argv[2])
const port = Number(process.argv[3] ?? 5273)
const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

const server = http.createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('Expires', '0')
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  const relative = pathname.replace(/^\/+/, '')
  const filePath = resolve(root, relative)
  const rootRelativePath = relativePath(root, filePath)
  if (rootRelativePath.startsWith('..') || isAbsolute(rootRelativePath)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }
  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('Not a file')
    const contentType = contentTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': contentType })
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`CORS static server: http://127.0.0.1:${port}`)
})

#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const HOST_DIR = join(ROOT, 'dist', 'host')
const FRAME_DIR = join(ROOT, 'dist', 'frame')
const INLINE_DIR = join(ROOT, 'dist', 'inline')
const HOST_FILE = join(HOST_DIR, 'mmd-hud-iframe-host.js')
const FRAME_FILE = join(FRAME_DIR, 'mmd-hud-iframe-frame.js')
const INLINE_FILE = join(INLINE_DIR, 'mmd-hud-iframe-inline.json')
const MANIFEST_FILE = join(INLINE_DIR, 'mmd-hud-iframe-inline-manifest.json')
const PLACEHOLDERS_FILE = join(INLINE_DIR, 'mmd-hud-iframe-inline.txt')
const FRAME_ENTRY = join(ROOT, 'src', 'frame', 'main.ts')
const EXPECTED_HOST_FILES = ['mmd-hud-iframe-host.js']
const EXPECTED_FRAME_FILES = ['mmd-hud-iframe-frame.js']
const EXPECTED_INLINE_FILES = [
  'mmd-hud-iframe-inline-manifest.json',
  'mmd-hud-iframe-inline.json',
  'mmd-hud-iframe-inline.txt',
]
const DRAGON_RAJA_MARKER = 'dragon-raja'

function requiredBuildId() {
  const value = process.env.MMD_HUD_BUILD_ID
  if (!value || value === 'dev') throw new Error('发布验证要求非 dev MMD_HUD_BUILD_ID')
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) throw new Error('MMD_HUD_BUILD_ID 格式无效')
  return value
}

function assertExactFiles(label, actual, expected) {
  const sortedActual = [...actual].sort()
  const sortedExpected = [...expected].sort()
  if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
    throw new Error(`${label} 目录文件不符合发布白名单：${sortedActual.join(', ') || '(空)'}`)
  }
}

const buildId = requiredBuildId()
const [hostFiles, frameFiles, inlineFiles, hostSource, frameSource, inlineSource, manifestSource, placeholdersSource, frameEntrySource] = await Promise.all([
  readdir(HOST_DIR), readdir(FRAME_DIR), readdir(INLINE_DIR),
  readFile(HOST_FILE, 'utf8'), readFile(FRAME_FILE, 'utf8'), readFile(INLINE_FILE, 'utf8'),
  readFile(MANIFEST_FILE, 'utf8'), readFile(PLACEHOLDERS_FILE, 'utf8'), readFile(FRAME_ENTRY, 'utf8'),
])

assertExactFiles('Host', hostFiles, EXPECTED_HOST_FILES)
assertExactFiles('Frame', frameFiles, EXPECTED_FRAME_FILES)
assertExactFiles('Inline', inlineFiles, EXPECTED_INLINE_FILES)
if (!hostSource.includes(buildId) || !frameSource.includes(buildId)) {
  throw new Error('Host/Frame 产物未同时包含当前 Build ID，可能来自不同构建')
}

const inline = JSON.parse(inlineSource)
const manifest = JSON.parse(manifestSource)
const rules = inline.regex_scripts
if (!Array.isArray(rules) || rules.length === 0) throw new Error('内嵌发布文件不包含正则规则')
if (inline.statusbar !== rules[0].findRegex || inline.statusbar.length > 200) throw new Error('statusbar 未正确设置首个链式注入占位符')

for (const [index, rule] of rules.entries()) {
  if (typeof rule.findRegex !== 'string' || typeof rule.scriptName !== 'string') throw new Error(`规则 ${index + 1} 结构无效`)
  if (typeof rule.replaceString !== 'string' || rule.replaceString.length > 20_000) throw new Error(`规则 ${index + 1} 超过平台 20,000 字符限制`)
  const next = rules[index + 1]?.findRegex
  if (next && !rule.replaceString.endsWith(next)) throw new Error(`规则 ${index + 1} 未链接到下一条规则`)
}

const expectedPlaceholders = `${rules.map((rule) => rule.findRegex).join('')}\n`
if (placeholdersSource !== expectedPlaceholders) throw new Error('占位符辅助文件与导入 JSON 不一致')
const hostParts = manifest.hostParts
const frameParts = manifest.frameParts
if (!Number.isInteger(hostParts) || !Number.isInteger(frameParts)
  || hostParts < 1 || frameParts < 1 || hostParts + frameParts + 1 !== rules.length
  || !rules.slice(0, hostParts).every((rule) => rule.replaceString.includes('s.h='))
  || !rules.slice(hostParts, hostParts + frameParts).every((rule) => rule.replaceString.includes('s.f='))) {
  throw new Error('inline manifest 的 Host/Frame 分片计数与规则链不一致')
}
if (manifest.version !== 1 || manifest.buildId !== buildId || manifest.totalRules !== rules.length
  || manifest.maxReplacementLength !== 18_000
  || manifest.entry !== rules.at(-1)?.findRegex
  || manifest.generatedFiles?.importJson !== 'mmd-hud-iframe-inline.json'
  || manifest.generatedFiles?.placeholders !== 'mmd-hud-iframe-inline.txt') throw new Error('inline manifest 与本次构建产物不一致')

if (!frameSource.includes(DRAGON_RAJA_MARKER)) throw new Error('发布产物未包含 Dragon Raja Theme 配置')
if (/from\s+['"][^'"]*themes\/game|import\s*\([^)]*themes\/game/.test(frameEntrySource)) throw new Error('Frame 入口仍引用 game Theme')

console.log(`Release verification passed: ${rules.length} inline rules; Build ID ${buildId}; dragon-raja`)

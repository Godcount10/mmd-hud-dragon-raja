#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_BRANCH = 'release/bridge-console'

function usage() {
  console.log(`用法：
  node scripts/push-release.mjs --repo <远程仓库地址>
  node scripts/push-release.mjs --repo <远程仓库地址> --branch <远程分支>
  node scripts/push-release.mjs --repo <远程仓库地址> --dry-run

说明：
  - 只推送当前 HEAD，不自动 commit、不修改 git remote 配置；
  - 默认要求当前分支为 ${DEFAULT_BRANCH}；
  - 推送前要求工作树干净；
  - 使用 --dry-run 执行 Git 远程 dry-run，不写入远程仓库。
`)
}

function parseArgs(argv) {
  const options = { repo: '', branch: DEFAULT_BRANCH, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      usage()
      process.exit(0)
    }
    if (argument === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (argument === '--repo') {
      options.repo = argv[++index] ?? ''
      continue
    }
    if (argument === '--branch') {
      options.branch = argv[++index] ?? ''
      continue
    }
    throw new Error(`未知参数：${argument}`)
  }
  return options
}

function assertRemoteUrl(value) {
  if (/^https:\/\//i.test(value) || /^ssh:\/\//i.test(value) || /^git@[^:]+:.+/i.test(value)) return
  throw new Error('仓库地址必须是 HTTPS、SSH URL 或 git@host:path 格式')
}

function assertBranchName(value) {
  if (!value || value.startsWith('-') || value.includes('..') || value.includes(' ')) {
    throw new Error('远程分支名无效')
  }
}

async function git(...args) {
  const result = await execFileAsync('git', args, { windowsHide: true })
  return result.stdout.trim()
}

const options = parseArgs(process.argv.slice(2))
if (!options.repo) {
  usage()
  throw new Error('必须使用 --repo 指定远程仓库地址')
}
assertRemoteUrl(options.repo)
assertBranchName(options.branch)
await git('check-ref-format', '--branch', options.branch)

const currentBranch = await git('branch', '--show-current')
if (currentBranch !== DEFAULT_BRANCH) {
  throw new Error(`当前分支是 ${currentBranch || '(detached HEAD)'}，拒绝推送；请切换到 ${DEFAULT_BRANCH}`)
}

const status = await git('status', '--porcelain')
if (status) {
  throw new Error('工作树不干净，拒绝推送；请先审查并提交所有发布改动')
}

const commit = await git('rev-parse', '--short=12', 'HEAD')
const remoteRef = `refs/heads/${options.branch}`
const pushArgs = ['push', options.repo, `HEAD:${remoteRef}`]

console.log(`目标仓库：${options.repo}`)
console.log(`目标分支：${options.branch}`)
console.log(`当前提交：${commit}`)
console.log(`动作：${options.dryRun ? 'dry-run，不推送' : '推送当前 HEAD'}`)

if (!options.dryRun) {
  await execFileAsync('git', pushArgs, { windowsHide: true, stdio: 'inherit' })
  console.log('推送完成；本脚本未写入或修改 git remote 配置。')
} else {
  await execFileAsync('git', ['push', '--dry-run', options.repo, `HEAD:${remoteRef}`], { windowsHide: true, stdio: 'inherit' })
  console.log('远程 dry-run 通过；未写入远程仓库。')
}

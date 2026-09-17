// Headless-Chrome (CDP) performance probe — captures cold-start metrics from
// the production build exactly as a real user would see them.
//
// Requires a built/served app (default: `npm run preview -- --port 5174`).
// Run from the repo root:
//
//   npm run build
//   npm run preview -- --port 5174 &
//   node scripts/perf-measure.mjs
//
// Configurable via env: URL, CDP_PORT, PROFILE_DIR, CHROME.

import { spawn } from 'node:child_process'

const CHROME =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = process.env.URL ?? 'http://localhost:5174/'
const CDP_PORT = process.env.CDP_PORT ?? '9229'
const PROFILE_DIR = process.env.PROFILE_DIR ?? `/tmp/opencode-perf-${CDP_PORT}`
const APP_PORT = new URL(BASE_URL).port

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE_DIR}`,
  '--window-size=1280,900', BASE_URL,
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page' && t.url.includes(APP_PORT))
      if (page) return page
    } catch {}
    await sleep(500)
  }
  throw new Error('no target — is the preview server running?')
}

let msgId = 0
const pending = new Map()
const errors = []
const connect = (url) => new Promise((res, rej) => {
  const ws = new WebSocket(url)
  ws.onopen = () => res(ws)
  ws.onerror = () => rej(new Error('ws error'))
})
const call = (ws, method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

async function evaluate(ws, expression) {
  const res = await call(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return res.result?.value
}

async function main() {
  const target = await getTarget()
  const ws = await connect(target.webSocketDebuggerUrl)
  ws.onmessage = (raw) => {
    const m = JSON.parse(raw.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(m.error.message)) : resolve(m.result)
      return
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + (m.params?.exceptionDetails?.exception?.description ?? ''))
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE.ERROR: ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
  await call(ws, 'Runtime.enable')
  await call(ws, 'Page.enable')

  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(ws, `document.body ? document.body.innerText.includes('Showing 1\u201325') : false`)
    if (ready) break
    await evaluate(ws, `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Try again')?.click()`)
    await sleep(800)
  }

  const result = await evaluate(ws, `(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const api = resources.find(r => r.initiatorType === 'fetch')
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      loadEventEnd: Math.round(nav?.loadEventEnd ?? 0),
      documentTransferSize: nav?.transferSize ?? null,
      resourceCount: resources.length,
      apiUrl: api?.name ?? null,
      apiDuration: api ? Math.round((api.responseEnd - api.fetchStart) * 100) / 100 : null,
      mountedListItems: document.querySelectorAll('[role="listitem"]').length,
      showing: document.body.innerText.match(/Showing[^\\n]*/)?.[0] ?? '',
    }
  })()`)

  console.log(JSON.stringify(result, null, 2))
  console.log('--- runtime errors ---')
  console.log(errors.length ? errors.join('\n') : '(none)')

  ws.close()
  chrome.kill()
  if (errors.length) process.exitCode = 1
}

main().catch((err) => { console.error('FAILED', err.message); chrome.kill(); process.exit(1) })
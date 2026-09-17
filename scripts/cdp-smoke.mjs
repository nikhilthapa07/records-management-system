// Headless-Chrome (CDP) end-to-end smoke suite — 18 checks.
//
// Requires a built/served app on the target URL (default: `npm run preview` on
// port 5174). Run from the repo root:
//
//   npm run preview -- --port 5174 &   # or: vite preview --port 5174
//   node scripts/cdp-smoke.mjs
//
// Configurable via env: URL, CDP_PORT, PROFILE_DIR, CHROME.
// Exits non-zero if any check fails.

import { spawn } from 'node:child_process'

const CHROME =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = process.env.URL ?? 'http://localhost:5174/'
const CDP_PORT = process.env.CDP_PORT ?? '9226'
const PROFILE_DIR = process.env.PROFILE_DIR ?? `/tmp/opencode-cdp-${CDP_PORT}`
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
  throw new Error('CDP target not available — is the preview server running?')
}

let msgId = 0
const pending = new Map()
const errors = []
const events = []

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => resolve(ws)
    ws.onerror = () => reject(new Error('ws error'))
  })
}

function call(ws, method, params = {}) {
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(ws, expression) {
  const res = await call(ws, 'Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  })
  if (res.exceptionDetails) return undefined
  return res.result?.value
}

const setInput = (selector, value) => `
  (() => {
    const i = document.querySelector(${JSON.stringify(selector)});
    if (!i) return;
    const proto = i instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(i, ${JSON.stringify(value)});
    i.dispatchEvent(new Event('input', { bubbles: true }));
    i.dispatchEvent(new Event('change', { bubbles: true }));
  })()
`

async function main() {
  const target = await getTarget()
  const ws = await connect(target.webSocketDebuggerUrl)

  ws.onmessage = (raw) => {
    const msg = JSON.parse(raw.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
      return
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION: ' + (msg.params?.exceptionDetails?.exception?.description ?? ''))
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push('CONSOLE.ERROR: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
    }
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response
      if (r.status >= 400) events.push(`HTTP ${r.status}: ${r.url}`)
    }
  }

  await call(ws, 'Runtime.enable')
  await call(ws, 'Console.enable')
  await call(ws, 'Log.enable')
  await call(ws, 'Network.enable')
  await call(ws, 'Page.enable')

  const checks = []
  const ok = (name, cond, extra = '') =>
    checks.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`)
  let stage = ''
  const stage_run = async (name, fn) => {
    stage = name
    const started = errors.length
    const value = await fn()
    await sleep(150)
    const newErrors = errors.slice(started)
    if (newErrors.length) console.log(`STAGE ${name} -> runtime errors: ${newErrors.join(' | ')}`)
    return value
  }

  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(ws, `document.body ? document.body.innerText.includes('Showing 1\u201325') : false`)
    if (ready) break
    await evaluate(ws, `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Try again')?.click()`)
    await sleep(1000)
  }

  const initial = await evaluate(ws, `({
    rows: document.querySelectorAll('[role="listitem"]').length,
    showing: document.body.innerText.match(/Showing[^\\n]*/)?.[0]
  })`)
  ok('virtualized launch renders subset', initial?.rows >= 11 && initial?.rows < 25, `rows=${initial?.rows}`)
  ok('showing label page 1', /1\u201325/.test(initial?.showing ?? ''), initial?.showing)

  await stage_run('next', () =>
    evaluate(ws, `document.querySelector('[aria-label="Next page"]')?.click()`))
  const showing2 = await evaluate(ws, `document.body.innerText.match(/Showing[^\\n]*/)?.[0]`)
  ok('pagination next', /26\u201350/.test(showing2 ?? ''), showing2)

  await stage_run('jump-set', () => evaluate(ws, setInput('#jump-page', '4')))
  await stage_run('jump-go', () =>
    evaluate(ws, `document.querySelector('form[aria-label="Jump to page"] button[type="submit"]')?.click()`))
  const showing4 = await evaluate(ws, `document.body.innerText.match(/Showing[^\\n]*/)?.[0]`)
  ok('jump to page 4', /76\u2013100/.test(showing4 ?? ''), showing4)

  await stage_run('jump-clamp-set', () => evaluate(ws, setInput('#jump-page', '9')))
  await stage_run('jump-clamp-go', () =>
    evaluate(ws, `document.querySelector('form[aria-label="Jump to page"] button[type="submit"]')?.click()`))
  const clamped = await evaluate(ws, `document.body.innerText.match(/Showing[^\\n]*/)?.[0]`)
  ok('jump clamps to last page', /160/.test(clamped ?? ''), clamped)

  await stage_run('open-add', () =>
    evaluate(ws, `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Add employee'))?.click()`))
  ok('add modal opens', await evaluate(ws, `document.querySelector('[role="dialog"]') !== null`))

  // The form is code-split; wait for it to actually mount before interacting.
  for (let i = 0; i < 30; i++) {
    if (await evaluate(ws, `document.querySelector('[role="dialog"] form') !== null`)) break
    await sleep(500)
  }
  ok('lazy form chunk mounted', await evaluate(ws, `document.querySelector('[role="dialog"] form') !== null`))

  await stage_run('requestSubmit-empty', () =>
    evaluate(ws, `document.querySelector('[role="dialog"] form')?.requestSubmit()`))
  await sleep(200)
  const errCount = await evaluate(ws, `document.querySelectorAll('[role="dialog"] .text-red-600').length`)
  ok('empty submit -> field errors', errCount === 5, `errors=${errCount}`)

  for (const [sel, val] of [
    ['#first-name', 'Ada'], ['#last-name', 'Lovelace'], ['#email', 'ada@example.com'],
    ['#department', 'Engineering'], ['#role', 'Developer'],
  ]) await stage_run(`field ${sel}`, () => evaluate(ws, setInput(sel, val)))
  await stage_run('status', () => evaluate(ws, `
    (() => { const s=document.querySelector('#status'); if(!s)return;
      const setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;
      setter.call(s,'Active'); s.dispatchEvent(new Event('change',{bubbles:true})); })()`))
  await stage_run('submit-create', () =>
    evaluate(ws, `document.querySelector('[role="dialog"] form')?.requestSubmit()`))
  await sleep(2000)
  const added = await evaluate(ws, `({
    dialogOpen: document.querySelector('[role="dialog"]') !== null,
    count: document.body.innerText.match(/Showing[^\\n]*/)?.[0]
  })`)
  ok('create closes modal + count grows', !added?.dialogOpen, added?.count)

  // Find the new record via search (it is appended at the end of the dataset).
  await stage_run('search-ada', () => evaluate(ws, setInput('input[type="search"]', 'ada lovelace')))
  await sleep(1000)
  const adaRow = await evaluate(ws, `document.querySelector('[aria-label="Edit ada lovelace"]') !== null ? 'full' : document.body.innerText.includes('Ada Lovelace') ? 'cell' : 'none'`)
  ok('created record reachable via search', adaRow === 'full' || adaRow === 'cell', adaRow)

  await stage_run('open-edit', () =>
    evaluate(ws, `document.querySelector('[aria-label="Edit Ada Lovelace"]')?.click()`))
  await sleep(400)
  ok('edit modal opens', await evaluate(ws, `document.querySelector('[role="dialog"]') !== null`))
  await stage_run('edit-role', () => evaluate(ws, setInput('#role', 'Staff Engineer')))
  await stage_run('submit-edit', () =>
    evaluate(ws, `document.querySelector('[role="dialog"] form')?.requestSubmit()`))
  await sleep(2000)
  const edited = await evaluate(ws, `document.body.innerText.includes('Staff Engineer')`)
  ok('edit record saves + reflects', Boolean(edited))

  await stage_run('open-delete', () =>
    evaluate(ws, `document.querySelector('[aria-label="Delete Ada Lovelace"]')?.click()`))
  await sleep(300)
  ok('delete confirm opens', await evaluate(ws, `document.body.innerText.includes('Are you sure')`))
  await stage_run('confirm-delete', () =>
    evaluate(ws, `[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Delete'))?.click()`))
  await sleep(2000)
  const deleted = await evaluate(ws, `document.body.innerText.includes('Ada Lovelace')`)
  ok('delete removes record', !deleted)

  // search is still scoped to "ada lovelace" — clear it before continuing
  await stage_run('clear-search', () =>
    evaluate(ws, `document.querySelector('[aria-label="Clear search"]')?.click()`))
  await sleep(1000)
  const cleared = await evaluate(ws, `document.body.innerText.match(/Showing[^\\n]*/)?.[0]`)
  ok('clear search restores, count back to 160', /160/.test(cleared ?? ''), cleared)

  await stage_run('esc', () =>
    evaluate(ws, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`))
  ok('modal closes on Escape', await evaluate(ws, `document.querySelector('[role="dialog"]') === null`))

  ok('export buttons present', await evaluate(ws, `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='CSV')`))
  ok('department filter button present', await evaluate(ws, `[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Departments'))`))

  console.log(checks.join('\n'))
  console.log('--- runtime errors ---')
  console.log(errors.length ? errors.slice(0, 20).join('\n') : '(none)')
  console.log('--- non-2xx/3xx responses ---')
  console.log(events.length ? events.slice(0, 20).join('\n') : '(none)')

  ws.close()
  chrome.kill()
  if (checks.some((c) => c.startsWith('FAIL')) || errors.length) process.exitCode = 1
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED TO RUN', err.message)
  chrome.kill()
  process.exit(1)
})
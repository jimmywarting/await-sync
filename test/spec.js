import { createWorker } from '../mod.js'

const ctrl = new AbortController()
const toSync = createWorker(ctrl.signal)

const fn = toSync(async function (pkg) {
  const { default: json } = await import(pkg, { assert: { type: 'json' } })
  const textEncoder = new TextEncoder()
  const str = JSON.stringify(json)
  return textEncoder.encode(str)
}, r => new TextDecoder().decode(r))

const pkg = fn(new URL('../package.json', import.meta.url) + '')
ctrl.abort()
const json = JSON.parse(pkg)
console.assert(json.name === 'to-sync', 'should return the same data')

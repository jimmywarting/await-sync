import { createWorker } from '../mod.js'

const ctrl = new AbortController()
const awaitSync = createWorker(ctrl.signal)

const fn = awaitSync(async function (pkg) {
  const { default: json } = await import(pkg, { assert: { type: 'json' } })
  const textEncoder = new TextEncoder()
  const str = JSON.stringify(json)
  return textEncoder.encode(str)
}, r => new TextDecoder().decode(r))

const pkg = fn(new URL('../package.json', import.meta.url) + '')
ctrl.abort()
const json = JSON.parse(pkg)

if (json.name === 'await-sync') {
  console.log('test completed')
} else {
  throw new Error('test failed')
}

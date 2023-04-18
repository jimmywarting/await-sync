import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { createWorker } from '../mod.js'
import makeSynchronous from 'make-synchronous'
import { createSyncFn } from 'synckit'


// the worker path must be absolute
const workerPath = new URL('./synkit-worker.js', import.meta.url).toString().slice(7)
const syncIt = createSyncFn(workerPath, {})

const sin = makeSynchronous(async path => {
  const fs = await import('fs/promises')
  return fs.readFile(new URL(path))
})

const path = new URL('./bench.js', import.meta.url) + ''

const jim = createWorker()(async path => {
  const fs = await import('fs/promises')
  return fs.readFile(new URL(path))
})

const control = Buffer.from(readFileSync(new URL(path))).toString()
console.assert(Buffer.from(syncIt(path)).toString() === control, 'should return the same data')
console.assert(Buffer.from(jim(path)).toString() === control, 'should return the same data')
console.assert(Buffer.from(sin(path)).toString() === control, 'should return the same data')

let i

i = 100
console.time('fs.readFileSync')
while (i--) readFileSync(new URL(path))
console.timeEnd('fs.readFileSync')

i = 100
console.time('synkit')
while (i--) syncIt(path)
console.timeEnd('synkit')

i = 100
console.time('to-sync')
while (i--) jim(path)
console.timeEnd('to-sync')

i = 100
console.time('make-syncronous')
while (i--) sin(path)
console.timeEnd('make-syncronous')

process.exit()

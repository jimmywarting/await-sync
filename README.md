# to-sync <img src="https://user-images.githubusercontent.com/1148376/183421896-8fea5bef-6d32-4f49-ab6c-f2fe7e6ac4ab.svg" width="20px" height="20px" title="This package contains built-in JSDoc declarations (...works as equally well as d.ts)" alt="JSDoc icon, indicating that this package has built-in type declarations">

> Make an asynchronous function synchronous

The only cross compatible solution that works fine in Deno, Bun.js, NodeJS and also Web Workers

The benefit of this package over other `desync` or `synckit`, `make-synchronous` and others
libs is that this only uses web tech like `Worker` and `SharedArrayBuffer`
instead of spawning new processes or using any nodes specific like: `receiveMessageOnPort(port)` or `WorkerData` to transfer the data. therefor this also runs fine in other environment too even
inside Web workers (but requires some [Security steps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)

What more? well, it uses a more enhanced [Worker](https://github.com/jimmywarting/whatwg-worker) inside of NodeJS that make it more
rich by supplementing it with a own `https://` loader so you can import things from cdn
You can also even do `import('blob:uuid')`

## Install

```sh
npm install to-sync
```

## Usage
```js
import { createWorker } from 'to-sync'

const toSync = createWorker()

const get = toSync(async url => {
	const res = await fetch(url)
  const ab = await res.arrayBuffer()

  // Must return Uint8Array.
	return new Uint8Array(ab)
})

fn('https://httpbin.org/get') // result as Uint8Array
```

## API

### toSync(fn, formatter?)

Returns a wrapped version of the given async function which executes synchronously.
This means no other code will execute (not even async code) until the given async function is done.

The given function is executed in a separate Worker thread, so you cannot use any variables/imports from outside the scope of the function. You can pass in arguments to the function. To import dependencies, use `await import(…)` in the function body.

The argument you supply to the returned wrapped function is send via postMessage
instead of using `Uint8Array` and `Atomics` so they are structural clone'able

But the response in the given function must always return a `Uint8Array` b/c
there is no other way to transfer the data over in a synchronous other than blocking
the main thread with `Atomic.wait()`

## Use a (de)serializer

If you only using this in NodeJS then there is a grate built in v8 (de)serializer
It supports most values, but not functions and symbols.

```js
import { deserialize } from 'node:v8'

const get = toSync(async url => {
  const { serialize } = await import('node:v8')
	const res = await fetch(url)
  const json = await res.json()

  return serialize(json)
}, deserialize)

const json = get('https://httpbin.org/get') // JSON
```

For the most part i reccommend just sticking to JSON.parse and stringify and TextDecoder/Encoder.
But if you need to transfer more structural data in other env. too then use something like cbox-x
or other binary representations, here is a list of [alternatives](https://jimmywarting.github.io/3th-party-structured-clone-wpt/)

## Misc

If two separate functions imports the same ESM then it will only be loaded once.
That's b/c they share the same worker thread. The web workers are never terminated.
so the first call may take a bit longer but the 2nd won't

```js
const fn1 = toSync(async () => {
  globalThis.xyz ??= 0
  console.log(globalThis.xyz++)

  const util = await import('./util.js')
  return new Uint8Array()
})

const fn2 = toSync(async () => {
  globalThis.xyz ??= 0
  console.log(globalThis.xyz++)

  const util = await import('./util.js')
  return new Uint8Array()
})

fn1() // Warm up - 527ms (logs: 0)
fn1() // instant - 24ms  (logs: 1)
fn2() // instant - 21ms  (logs: 2)
```

To terminate the worker, pass in a signal and kill it using a `AbortController`

```js
const ctrl = new AbortController()
createWorker(ctrl.signal)
ctrl.abort()
```

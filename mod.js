/*! to-sync. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

// Use the native Worker if available, otherwise use the polyfill
// const Work = globalThis.Worker || await import('whatwg-worker').then(m => m.default)
const Work = await import('/Users/jimmywarting/git/web-worker/node-worker.js').then(m => m.default)

function createWorker (signal) {
  // Create a shared buffer to communicate with the worker thread
  const ab = new SharedArrayBuffer(8192)
  const data = new Uint8Array(ab, 8)
  const int32 = new Int32Array(ab)

  // Create the worker thread
  const url = new URL('./worker.js', import.meta.url)
  const worker = new Work(url, { type: 'module' })

  // Terminate the worker thread if a signal is aborted
  signal?.addEventListener('abort', () => worker.terminate())

  return function awaitSync (fn, formatter) {
    const source = 'export default ' + fn.toString()
    const mc = new MessageChannel()
    const localPort = mc.port1
    const remotePort = mc.port2
    worker.postMessage({ port: remotePort, code: source, ab }, [remotePort])

    return function runSync (...args) {
      Atomics.store(int32, 0, 0)
      // Send the arguments to the worker thread
      localPort.postMessage(args)
      // Wait for the worker thread to send the result back
      Atomics.wait(int32, 0, 0)

      // Two first values in the shared buffer are the number of bytes left to
      // read and the second value is a boolean indicating if the result was
      // successful or not.
      let bytesLeft = int32[0]
      const ok = int32[1]

      if (bytesLeft === -1) {
        return new Uint8Array(0)
      }

      // Allocate a new Uint8Array to store the result
      const result = new Uint8Array(bytesLeft)
      let offset = 0

      // Read the result from the shared buffer
      while (bytesLeft > 0) {
        // Read all the data that is available in the SharedBuffer
        const part = data.subarray(0, Math.min(bytesLeft, data.byteLength))
        // Copy the data to the result
        result.set(part, offset)
        // Update the offset
        offset += part.byteLength
        // If we have read all the data, break the loop
        if (offset === result.byteLength) break
        // Notify the worker thread that we are ready to receive more data
        Atomics.notify(int32, 0)
        // Wait for the worker thread to send more data
        Atomics.wait(int32, 0, bytesLeft)
        // Update the number of bytes left to read
        bytesLeft -= part.byteLength
      }

      if (ok) {
        return formatter ? formatter(result) : result
      }

      const str = new TextDecoder().decode(result)
      const err = JSON.parse(str)
      const error = new Error(err.message)
      error.stack = err.stack
      throw error
    }
  }
}

export {
  createWorker
}

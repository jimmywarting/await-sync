/*! to-sync. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

const textEncoder = new TextEncoder()

addEventListener('message', async evt => {
  const { port, code, ab } = evt.data
  const data = new Uint8Array(ab, 8)
  const int32 = new Int32Array(ab, 0, 2)

  /** @param {Uint8Array} buf */
  const write = buf => {
    let bytesLeft = buf.byteLength
    let offset = 0

    while (bytesLeft > 0) {
      int32[0] = bytesLeft
      const chunkSize = Math.min(bytesLeft, data.byteLength)
      data.set(buf.subarray(offset, offset + chunkSize), 0)
      Atomics.notify(int32, 0)
      if (bytesLeft === chunkSize) break
      Atomics.wait(int32, 0, bytesLeft)
      bytesLeft -= chunkSize
      offset += chunkSize
    }
  }

  // const blob = new Blob([code], { type: 'text/javascript' })
  // const url = URL.createObjectURL(blob)
  const url = "data:text/javascript," + encodeURIComponent(code)
  const { default: fn } = await import(url)

  port.onmessage = async function onmessage (evt) {
    const args = evt.data
    const [u8, ok] = await Promise.resolve(fn(...args))
      .then(r => {
        if (!(r instanceof Uint8Array)) {
          throw new Error('result must be a Uint8Array, got: ' + typeof r)
        }
        return [r, 1]
      })
      .catch(e => {
        const err = JSON.stringify({
          message: e?.message || e,
          stack: e?.stack
        })
        const r = textEncoder.encode(err)
        return [r, 0]
      })

    int32[1] = ok
    write(u8)
  }
})

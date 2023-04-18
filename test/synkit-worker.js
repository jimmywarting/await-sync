// worker.js
import { runAsWorker } from 'synckit'

runAsWorker(async (path) => {
  const fs = await import('fs/promises')
  return fs.readFile(new URL(path))
})

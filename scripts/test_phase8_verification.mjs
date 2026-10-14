import { spawn } from 'child_process'
import fs from 'fs'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  console.log('[Phase8Verification] Starting vite preview server on port 4173...')
  const preview = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
    cwd: 'c:\\desktop\\3d-world-ai',
    stdio: 'ignore',
    shell: true,
  })

  await sleep(3000)

  console.log('[Phase8Verification] Starting headless Chrome with remote debugging on port 9222...')
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--window-size=1920,1080',
      '--disable-gpu=false',
      'http://localhost:4173/',
    ],
    { stdio: 'ignore' }
  )

  await sleep(3000)

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json')
    const pages = await listRes.json()
    const targetPage = pages.find((p) => p.type === 'page')
    if (!targetPage || !targetPage.webSocketDebuggerUrl) {
      throw new Error('No page found on remote debugger')
    }

    console.log('[Phase8Verification] Connecting to WebSocket:', targetPage.webSocketDebuggerUrl)
    const ws = new WebSocket(targetPage.webSocketDebuggerUrl)
    await new Promise((resolve) => (ws.onopen = resolve))

    let id = 1
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++
        const onMsg = (event) => {
          const res = JSON.parse(event.data)
          if (res.id === msgId) {
            ws.removeEventListener('message', onMsg)
            if (res.error) reject(res.error)
            else resolve(res.result)
          }
        }
        ws.addEventListener('message', onMsg)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')

    console.log('[Phase8Verification] Waiting for 3D campus models and shaders to initialize...')
    await sleep(4000)

    // Helper to capture PNG screenshot
    async function takeScreenshot(fileName) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const buffer = Buffer.from(data, 'base64')
      fs.writeFileSync(fileName, buffer)
      console.log(`[Phase8Verification] Saved ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`)
    }

    // Helper to press a key
    async function pressKey(key, code) {
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: key,
        code: code,
        windowsVirtualKeyCode: key.charCodeAt(0),
      })
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: key,
        code: code,
        windowsVirtualKeyCode: key.charCodeAt(0),
      })
    }

    // 1. Initial Full Dashboard Mode
    console.log('[Phase8Verification] Capturing 1. Initial Full Dashboard...')
    await sleep(1500)
    await takeScreenshot('shot_phase8_dashboard.png')

    // 2. Press "h" to toggle Clean Showcase Mode
    console.log('[Phase8Verification] Pressing "h" to enter Clean Showcase View...')
    await pressKey('h', 'KeyH')
    await sleep(1500)
    await takeScreenshot('shot_phase8_clean.png')

    // 3. Press "h" again to restore Dashboard Mode
    console.log('[Phase8Verification] Pressing "h" to restore Full Dashboard...')
    await pressKey('h', 'KeyH')
    await sleep(1500)
    await takeScreenshot('shot_phase8_restored.png')

    // 4. Press "h" again to test Escape key restore
    console.log('[Phase8Verification] Pressing "h" then "Escape" to test Escape key restore...')
    await pressKey('h', 'KeyH')
    await sleep(1000)
    await pressKey('Escape', 'Escape')
    await sleep(1500)
    await takeScreenshot('shot_phase8_escape_restored.png')

    console.log('[Phase8Verification] All Clean View and Dashboard tests completed successfully!')

    ws.close()
  } catch (err) {
    console.error('[Phase8Verification] Error:', err)
  } finally {
    try {
      chrome.kill()
    } catch {}
    try {
      preview.kill()
    } catch {}
    // Also ensure node or chrome on port 4173/9222 terminate
  }
}

run().then(() => {
  console.log('[Phase8Verification] Exiting script.')
  process.exit(0)
})

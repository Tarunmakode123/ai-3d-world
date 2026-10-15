import { spawn } from 'child_process'
import fs from 'fs'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  console.log('[PbrPocTest] Starting vite preview server on port 4173...')
  const preview = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
    cwd: 'c:\\desktop\\3d-world-ai',
    stdio: 'ignore',
    shell: true,
  })

  await sleep(3000)

  console.log('[PbrPocTest] Starting headless Chrome with remote debugging on port 9222...')
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

    console.log('[PbrPocTest] Connecting to WebSocket:', targetPage.webSocketDebuggerUrl)
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

    console.log('[PbrPocTest] Waiting for 3D campus models and PBR shaders to initialize...')
    await sleep(4000)

    // Helper to capture PNG screenshot
    async function takeScreenshot(fileName) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const buffer = Buffer.from(data, 'base64')
      fs.writeFileSync(fileName, buffer)
      console.log(`[PbrPocTest] Saved ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`)
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

    // 1. Capture Master Campus Overview showing illuminated CORELINE logo & Hall A
    console.log('[PbrPocTest] 1. Capturing Master Campus Overview with illuminated CORELINE signage...')
    await sleep(1500)
    await takeScreenshot('poc_campus_overview.png')

    // 2. Switch to Cinematic Tour and navigate to Representative PBR PoC waypoint
    console.log('[PbrPocTest] 2. Pressing "c" to launch Cinematic Showcase Tour...')
    await pressKey('c', 'KeyC')
    await sleep(2000)

    console.log('[PbrPocTest] 3. Pressing "2" to jump directly to Representative PBR Rack & Cutaway PoC waypoint...')
    await pressKey('2', 'Digit2')
    await sleep(3500)
    await takeScreenshot('poc_rack_closeup.png')

    // 3. Clean View of the PoC
    console.log('[PbrPocTest] 4. Pressing "h" to toggle Clean Recording View of PoC...')
    await pressKey('h', 'KeyH')
    await sleep(1500)
    await takeScreenshot('poc_rack_closeup_clean.png')

    // 4. Return to Master View
    console.log('[PbrPocTest] 5. Pressing "Escape" to exit showcase mode...')
    await pressKey('Escape', 'Escape')
    await sleep(2000)

    console.log('[PbrPocTest] All Proof of Concept tests completed successfully!')
    ws.close()
  } catch (err) {
    console.error('[PbrPocTest] Error:', err)
  } finally {
    try {
      chrome.kill()
    } catch {}
    try {
      preview.kill()
    } catch {}
  }
}

run().then(() => {
  console.log('[PbrPocTest] Exiting script.')
  process.exit(0)
})

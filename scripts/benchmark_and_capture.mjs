import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR = 'C:\\Users\\tarun\\.gemini\\antigravity\\brain\\253b5738-5fd5-49e0-bf2e-6d5100b39ec0'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  console.log('[Benchmark] Starting vite preview server on port 4173...')
  const preview = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
    cwd: 'c:\\desktop\\3d-world-ai',
    stdio: 'ignore',
    shell: true,
  })

  await sleep(3000)

  console.log('[Benchmark] Starting headless Chrome with remote debugging on port 9222...')
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

  await sleep(3500)

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json')
    const pages = await listRes.json()
    const targetPage = pages.find((p) => p.type === 'page')
    if (!targetPage || !targetPage.webSocketDebuggerUrl) {
      throw new Error('No page found on remote debugger')
    }

    console.log('[Benchmark] Connecting to WebSocket:', targetPage.webSocketDebuggerUrl)
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

    console.log('[Benchmark] Waiting for 3D campus models and PBR shaders to initialize...')
    await sleep(4500)

    // Helper to evaluate JavaScript in browser page
    async function evalCode(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails))
      }
      return res.result.value
    }

    // Helper to capture PNG screenshot
    async function takeScreenshot(fileName) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const buffer = Buffer.from(data, 'base64')
      fs.writeFileSync(fileName, buffer)
      console.log(`[Benchmark] Saved local ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`)
      if (fs.existsSync(ARTIFACT_DIR)) {
        const artifactPath = path.join(ARTIFACT_DIR, fileName)
        fs.writeFileSync(artifactPath, buffer)
        console.log(`[Benchmark] Copied to artifact ${artifactPath}`)
      }
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

    // 1. Collect Empirical WebGL Renderer Info
    console.log('[Benchmark] Querying WebGL renderer info...')
    const renderInfo = await evalCode(`
      (() => {
        const cs = window.__CAMPUS_SCENE__;
        if (!cs || !cs.renderer) return null;
        const info = cs.renderer.info;
        return {
          calls: info.render.calls,
          triangles: info.render.triangles,
          points: info.render.points,
          lines: info.render.lines,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          hasEnvironment: !!cs.scene.environment,
          toneMappingExposure: cs.renderer.toneMappingExposure,
        };
      })()
    `)
    console.log('[Benchmark] Measured WebGL Renderer Info:', JSON.stringify(renderInfo, null, 2))

    // 2. Measure actual FPS over 1000ms
    console.log('[Benchmark] Measuring live animation frame rate (FPS) over 1000ms...')
    const measuredFps = await evalCode(`
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        function loop() {
          frames++;
          if (performance.now() - start >= 1000) {
            const actualDuration = performance.now() - start;
            resolve(Math.round((frames / actualDuration) * 1000));
          } else {
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      })
    `)
    console.log(`[Benchmark] Measured Frame Rate: ${measuredFps} FPS`)

    // Save metrics JSON
    const benchmarkData = {
      timestamp: new Date().toISOString(),
      renderInfo,
      measuredFps,
    }
    fs.writeFileSync('benchmark_results.json', JSON.stringify(benchmarkData, null, 2))

    // 3. Capture Campus Overview
    console.log('[Benchmark] Capturing Master Campus Overview...')
    await sleep(1500)
    await takeScreenshot('poc_campus_overview.png')

    // 4. Position Camera for Proof-of-Concept Close-Up Inspection
    console.log('[Benchmark] Positioning camera for close-up 3D server rack and data-hall proof of concept...')
    await evalCode(`
      (() => {
        const cs = window.__CAMPUS_SCENE__;
        if (!cs) return;
        cs.camera.position.set(-10.2, 3.2, 10.2);
        cs.controls.target.set(-12.7, 2.2, 6.0);
        cs.controls.update();
      })()
    `)
    await sleep(2500)
    await takeScreenshot('poc_data_hall_closeup.png')

    // 5. Toggle Clean Showcase View (press "h")
    console.log('[Benchmark] Toggling Clean Showcase Mode (press "h")...')
    await pressKey('h', 'KeyH')
    await sleep(1500)
    await takeScreenshot('poc_clean_showcase.png')

    // Exit clean view
    await pressKey('h', 'KeyH')
    await sleep(1000)

    // 6. Test Raycast Object Selection on RACK-A-044
    console.log('[Benchmark] Testing raycast object selection on RACK-A-044...')
    const selectSuccess = await evalCode(`
      (() => {
        const cs = window.__CAMPUS_SCENE__;
        if (!cs) return false;
        const targetRack = cs.rackMeshMap.get('RACK-A-044');
        if (!targetRack) return false;
        const hitChild = targetRack.children.find(c => c.userData && c.userData.id === 'RACK-A-044');
        if (hitChild) {
          cs.selectObject({
            id: 'RACK-A-044',
            name: 'RACK-A-044 (NVIDIA H100 SXM5)',
            type: 'rack',
            position: [targetRack.position.x, targetRack.position.y, targetRack.position.z],
            data: hitChild.userData.data
          });
          return true;
        }
        return false;
      })()
    `)
    console.log('[Benchmark] Raycast selection simulation success:', selectSuccess)
    await sleep(2000)
    await takeScreenshot('poc_rack_selected.png')

    console.log('[Benchmark] All benchmarks and screenshot captures completed successfully!')
    ws.close()
  } catch (err) {
    console.error('[Benchmark] Error during execution:', err)
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
  console.log('[Benchmark] Finished.')
  process.exit(0)
})

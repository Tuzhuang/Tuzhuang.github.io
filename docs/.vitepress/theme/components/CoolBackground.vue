<script setup lang="ts">
/**
 * 球面光带流动炫酷背景
 * 灵感来源：博客园 canvas 炫酷背景（https://www.cnblogs.com/zhangshuhao1116/p/18199561）
 *
 * 实现思路：
 *  - 用 three.js 在球面参数化曲线上画 N 条线（AdditiveBlending + vertexColors）
 *  - 每条线有一段"亮段"沿曲线流动，循环
 *  - UnrealBloomPass 后处理让亮段发光，整体场景缓慢自转
 *  - 只在首页 .VPHome 渲染，路由切换/不可见时暂停 RAF，节省性能
 *
 * 依赖通过 esm.sh CDN 动态加载，不增加项目 npm 依赖
 */
import { onMounted, onBeforeUnmount } from 'vue'

// 用 new Function 构造动态 import，避免 Vite 静态分析与打包
const importUrl = <T,>(u: string): Promise<T> =>
  (new Function('u', 'return import(/* @vite-ignore */ u)'))(u) as Promise<T>

const CDN = 'https://esm.sh/three@0.160.0'

interface FlowLine {
  geometry: any
  line: any
  colors: Float32Array
  count: number
  head: number
  speed: number
  visibleLen: number
  color: { r: number; g: number; b: number }
  step: () => void
}

let disposed = false
let rafId = 0
let canvas: HTMLCanvasElement | null = null
let observer: MutationObserver | null = null
let resizeHandler: (() => void) | null = null

onMounted(async () => {
  // 等页面其他动画启动后再启动，避免抢资源
  await new Promise((r) => setTimeout(r, 1000))
  if (disposed) return

  // 尊重用户减少动画偏好
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // 动态加载 three.js 与 postprocessing
  const [THREE, composerMod, renderPassMod, bloomMod] = await Promise.all([
    importUrl<any>(CDN),
    importUrl<any>(`${CDN}/examples/jsm/postprocessing/EffectComposer.js?deps=three@0.160.0`),
    importUrl<any>(`${CDN}/examples/jsm/postprocessing/RenderPass.js?deps=three@0.160.0`),
    importUrl<any>(`${CDN}/examples/jsm/postprocessing/UnrealBloomPass.js?deps=three@0.160.0`)
  ])
  if (disposed) return

  const { EffectComposer } = composerMod
  const { RenderPass } = renderPassMod
  const { UnrealBloomPass } = bloomMod

  // 调色板（与原帖一致）
  const palette = ['#FFFAFF', '#0A2463', '#3E92CC', '#723bb7', '#efd28e', '#3f9d8c'].map(
    (c) => new THREE.Color(c)
  )
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const rand = (a: number, b: number) => a + Math.random() * (b - a)

  // ---- 渲染器 ----
  canvas = document.createElement('canvas')
  canvas.className = 'cool-bg-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const setSize = () => renderer.setSize(window.innerWidth, window.innerHeight, false)
  setSize()

  // ---- 场景 / 相机 ----
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  camera.position.set(0, 0, 7)

  // ---- 球面参考（用于把光带整体装进一个 Group，统一旋转）----
  const group = new THREE.Group()
  scene.add(group)

  // ---- 球面螺旋曲线生成 ----
  // 球面参数：半径 r，theta 绕 Y 轴，phi 从 +Y 轴向下的极角
  const helixPoints = (
    r: number,
    thetaStart: number,
    thetaLen: number,
    phiStart: number,
    phiLen: number,
    segments: number
  ) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const theta = thetaStart + t * thetaLen
      const phi = phiStart + t * phiLen
      const sp = Math.sin(phi)
      pts.push(
        new THREE.Vector3(
          r * sp * Math.cos(theta),
          r * Math.cos(phi),
          r * sp * Math.sin(theta)
        )
      )
    }
    return pts
  }

  // ---- 流动光带 ----
  const SEG = 200 // 每条线分段数
  const LINES = 36 // 光带数量
  const lines: FlowLine[] = []

  const createFlowLine = () => {
    // 与原帖类似的局部球面切片：phi 起始 ~4 rad、长度 ~2.1 rad
    const phiStart = rand(3.6, 4.4)
    const phiLen = rand(1.8, 2.4)
    const thetaStart = rand(0, Math.PI * 2)
    const turns = rand(1.5, 3.2)
    const thetaLen = Math.PI * 2 * turns
    const r = 4

    const pts = helixPoints(r, thetaStart, thetaLen, phiStart, phiLen, SEG)
    const geometry = new THREE.BufferGeometry().setFromPoints(pts)

    const count = pts.length
    const colors = new Float32Array(count * 3)
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
    const line = new THREE.Line(geometry, material)
    group.add(line)

    const color = pick(palette)
    const visibleLen = rand(0.06, 0.25)
    const speed = rand(0.0015, 0.006)

    const obj: FlowLine = {
      geometry,
      line,
      colors,
      count,
      head: Math.random(),
      speed,
      visibleLen,
      color: { r: color.r, g: color.g, b: color.b },
      step() {
        obj.head = (obj.head + obj.speed) % 1
        const head = obj.head
        const tail = head - obj.visibleLen
        for (let i = 0; i < obj.count; i++) {
          const t = i / (obj.count - 1)
          // 计算亮段上的归一化位置 alpha∈[0,1]，不在段内为 -1
          let a = -1
          if (tail >= 0) {
            if (t >= tail && t <= head) a = (t - tail) / obj.visibleLen
          } else if (t <= head) {
            a = (t + (1 - tail)) / obj.visibleLen
          } else if (t >= tail + 1) {
            a = (t - (tail + 1)) / obj.visibleLen
          }
          // smoothstep 让亮段头尾平滑过渡，避免硬边
          const s = a < 0 ? 0 : a > 1 ? 1 : a * a * (3 - 2 * a)
          obj.colors[i * 3] = obj.color.r * s
          obj.colors[i * 3 + 1] = obj.color.g * s
          obj.colors[i * 3 + 2] = obj.color.b * s
        }
        obj.geometry.attributes.color.needsUpdate = true
      }
    }
    obj.step()
    return obj
  }

  for (let i = 0; i < LINES; i++) lines.push(createFlowLine())

  // ---- 后处理：Bloom 辉光 ----
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.1, // strength
    0.6, // radius
    0.0 // threshold
  )
  composer.addPass(bloomPass)

  // ---- 渲染循环 ----
  let running = false
  const render = () => {
    if (!running) return
    for (const l of lines) l.step()
    // 整体缓慢自转（参考原帖 R.rotation.y -= 4e-4, x -= 2e-4）
    group.rotation.y -= 0.0006
    group.rotation.x -= 0.0003
    composer.render()
    rafId = requestAnimationFrame(render)
  }

  const start = () => {
    if (running) return
    running = true
    rafId = requestAnimationFrame(render)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(rafId)
  }

  // ---- 首页检测：只在 .VPHome 存在时渲染 ----
  const checkHome = () => {
    if (document.querySelector('.VPHome')) start()
    else stop()
  }
  checkHome()

  observer = new MutationObserver(checkHome)
  observer.observe(document.body, { childList: true, subtree: true })

  // ---- 自适应 ----
  resizeHandler = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    bloomPass.setSize(w, h)
  }
  window.addEventListener('resize', resizeHandler, { passive: true })

  // 页面不可见时暂停，节省性能
  const onVisibility = () => (document.hidden ? stop() : checkHome())
  document.addEventListener('visibilitychange', onVisibility)

  // 保存清理引用
  cleanupAll = () => {
    stop()
    observer?.disconnect()
    observer = null
    window.removeEventListener('resize', resizeHandler!)
    document.removeEventListener('visibilitychange', onVisibility)
    for (const l of lines) {
      l.geometry.dispose()
      l.line.material.dispose()
    }
    composer.dispose?.()
    renderer.dispose()
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
    canvas = null
    resizeHandler = null
  }
})

let cleanupAll = () => {}

onBeforeUnmount(() => {
  disposed = true
  cleanupAll()
})
</script>

<template>
  <!-- canvas 在 onMounted 中动态创建并挂到 body -->
</template>

<style scoped>
/* 无 markup */
</style>

<style>
/* 炫酷背景 canvas：作为页面最底层背景，screen 混合让 .VPHome 渐变背景透出 */
.cool-bg-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: screen;
}

/* 暗色模式下亮度更突出，仍用 screen */
html.dark .cool-bg-canvas {
  mix-blend-mode: screen;
  opacity: 0.85;
}

/* 浅色模式下降低亮度，避免干扰阅读 */
html:not(.dark) .cool-bg-canvas {
  opacity: 0.5;
}

/* 用户偏好减少动画：完全隐藏 */
@media (prefers-reduced-motion: reduce) {
  .cool-bg-canvas {
    display: none;
  }
}
</style>

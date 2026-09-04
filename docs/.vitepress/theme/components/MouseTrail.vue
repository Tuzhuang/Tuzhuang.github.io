<script setup lang="ts">
/**
 * 鼠标彩色粒子尾巴特效
 *  - 全屏 canvas，z-index 0，pointer-events: none
 *  - 鼠标移动时持续喷射彩色粒子，沿鼠标轨迹淡出
 *  - 颜色取自博客主题色：青蓝紫渐变
 */
import { onMounted, onBeforeUnmount } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let rafId = 0
let dpr = 1
let lastEmit = 0
let mouseX = -9999
let mouseY = -9999
let visible = false

// 主题色青蓝紫，HSL hue 值
const HUES = [186, 213, 264, 298, 230] // 青、蓝、紫、粉、蓝紫

function resize() {
  if (!canvas) return
  dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  ctx?.scale(dpr, dpr)
}

function emit(x: number, y: number, count = 3) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.3 + Math.random() * 1.6
    const maxLife = 60 + Math.random() * 60
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife,
      size: 1 + Math.random() * 2.5,
      hue: HUES[Math.floor(Math.random() * HUES.length)]
    })
  }
  // 控制总数，避免性能问题
  if (particles.length > 400) particles.splice(0, particles.length - 400)
}

function tick(now: number) {
  if (!ctx || !canvas) return
  const w = window.innerWidth
  const h = window.innerHeight

  // 鼠标移动时持续喷射（节流：每 ~16ms 一次）
  if (visible && now - lastEmit > 12) {
    emit(mouseX, mouseY, 2)
    lastEmit = now
  }

  // 半透明覆盖，让旧粒子拖出尾巴
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.globalCompositeOperation = 'destination-out' // 让 canvas 上旧粒子淡出
  ctx.fillRect(0, 0, w, h)

  // 重新用正常叠加模式绘制新粒子
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy + 0.02 // 轻微重力
    p.vx *= 0.985
    p.vy *= 0.985
    p.life += 1
    const t = p.life / p.maxLife
    if (t >= 1) {
      particles.splice(i, 1)
      continue
    }
    const alpha = 1 - t
    const size = p.size * (1 - t * 0.4)

    ctx.beginPath()
    ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${alpha})`
    ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, ${alpha})`
    ctx.shadowBlur = 8
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowBlur = 0

  rafId = requestAnimationFrame(tick)
}

function onMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY
  if (!visible) visible = true
}

function onLeave() {
  visible = false
}

function onTouch(e: TouchEvent) {
  if (e.touches[0]) {
    mouseX = e.touches[0].clientX
    mouseY = e.touches[0].clientY
    if (!visible) visible = true
  }
}

onMounted(() => {
  // 页面加载完成后再挂载，避免与 hero 动画抢资源
  setTimeout(() => {
    canvas = document.createElement('canvas')
    canvas.className = 'mouse-trail-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.appendChild(canvas)

    const c2d = canvas.getContext('2d')
    if (!c2d) return
    ctx = c2d
    resize()

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseleave', onLeave, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })

    rafId = requestAnimationFrame(tick)
  }, 800)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseleave', onLeave)
  window.removeEventListener('touchmove', onTouch)
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
  canvas = null
  ctx = null
  particles = []
})
</script>

<template>
  <!-- 渲染到 body 上的 canvas 在 onMounted 中动态创建，这里无 markup -->
</template>

<style scoped>
/* 此组件无 markup，样式直接写在动态创建的 canvas 上 */
</style>

<style>
/* 全局样式：动态创建的 canvas 浮层 */
.mouse-trail-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: screen;
}

html.dark .mouse-trail-canvas {
  mix-blend-mode: screen;
}

@media (prefers-reduced-motion: reduce) {
  .mouse-trail-canvas { display: none; }
}
</style>
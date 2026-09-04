<script setup lang="ts">
/**
 * 粒子连线网络背景（跟随鼠标）
 * 灵感来源：博客园美化 - 网站动态背景线条跟随鼠标移动
 *   https://www.cnblogs.com/zhangshuhao1116/p/14914078.html
 *
 * 实现思路：
 *  - 屏幕上 N 个随机游走的粒子，碰边反弹
 *  - 粒子两两距离 < max 时连线，距离越近线越粗越亮
 *  - 鼠标作为一个"特殊粒子"，也和附近粒子连线，并对附近粒子产生轻微推力
 *  - 全站常驻，作为最底层装饰背景
 *  - 颜色用博客主题色青蓝紫，与现有 CoolBackground / MouseTrail 协调
 *
 * 纯 Canvas 2D 实现，无第三方依赖
 */
import { onMounted, onBeforeUnmount } from 'vue'

interface Particle {
  x: number
  y: number
  xa: number // x 方向速度
  ya: number // y 方向速度
  max: number // 连线最大距离
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let rafId = 0
let width = 0
let height = 0
let dpr = 1

// 鼠标作为一个特殊粒子（max 较大，影响范围更远）
const mouse: Particle = { x: -9999, y: -9999, xa: 0, ya: 0, max: 16000 }

// 主题色青蓝紫 RGB（连线颜色）
const COLOR = '30,128,255' // #1e80ff
// 粒子点颜色（亮色，便于在深色背景上可见）
const DOT_COLOR = '105,177,255'

// 根据屏幕面积自适应粒子数，避免大屏稀疏 / 小屏过密
function getParticleCount() {
  const area = window.innerWidth * window.innerHeight
  // 大约每 9000px² 一个粒子，限制在 [60, 180]
  return Math.max(60, Math.min(180, Math.floor(area / 9000)))
}

function resize() {
  if (!canvas) return
  dpr = window.devicePixelRatio || 1
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx?.setTransform(1, 0, 0, 1, 0, 0)
  ctx?.scale(dpr, dpr)
}

function initParticles() {
  const count = getParticleCount()
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      xa: 2 * Math.random() - 1,
      ya: 2 * Math.random() - 1,
      // 连线最大距离的平方，约 120px
      max: 120 * 120
    })
  }
}

function tick() {
  if (!ctx) return
  // 清屏
  ctx.clearRect(0, 0, width, height)

  // 所有粒子（含鼠标）
  const all = particles.concat([mouse])

  for (let x = 0; x < all.length; x++) {
    const p = all[x]
    // 鼠标粒子不游走
    if (p !== mouse) {
      p.x += p.xa
      p.y += p.ya
      // 碰边反弹
      p.xa *= p.x > width || p.x < 0 ? -1 : 1
      p.ya *= p.y > height || p.y < 0 ? -1 : 1
      // 限制最大速度，避免越来越快
      const sp = Math.sqrt(p.xa * p.xa + p.ya * p.ya)
      if (sp > 1.5) {
        p.xa = (p.xa / sp) * 1.5
        p.ya = (p.ya / sp) * 1.5
      }
      // 绘制粒子点（1.5px 方块）
      ctx.fillStyle = `rgba(${DOT_COLOR},0.85)`
      ctx.fillRect(p.x - 0.75, p.y - 0.75, 1.5, 1.5)
    }

    // 与后续粒子计算连线
    for (let y = x + 1; y < all.length; y++) {
      const n = all[y]
      const dx = p.x - n.x
      const dy = p.y - n.y
      const dist2 = dx * dx + dy * dy
      // 取两者中较小的 max 作为连线阈值
      const maxDist2 = Math.min(p.max, n.max)
      if (dist2 < maxDist2) {
        // 鼠标对附近粒子的轻微推力（参考原帖）
        if (n === mouse && dist2 >= n.max / 2) {
          p.x -= 0.03 * dx
          p.y -= 0.03 * dy
        }
        // 距离越近线越粗越亮
        const ratio = (maxDist2 - dist2) / maxDist2
        ctx.beginPath()
        ctx.lineWidth = ratio / 2
        ctx.strokeStyle = `rgba(${COLOR},${ratio + 0.2})`
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(n.x, n.y)
        ctx.stroke()
      }
    }
  }

  rafId = requestAnimationFrame(tick)
}

function onMouseMove(e: MouseEvent) {
  mouse.x = e.clientX
  mouse.y = e.clientY
}

function onMouseOut() {
  mouse.x = -9999
  mouse.y = -9999
}

function onTouch(e: TouchEvent) {
  if (e.touches[0]) {
    mouse.x = e.touches[0].clientX
    mouse.y = e.touches[0].clientY
  }
}

let resizeTimer = 0
function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    resize()
    initParticles()
  }, 200)
}

onMounted(() => {
  // 尊重用户减少动画偏好
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  canvas = document.createElement('canvas')
  canvas.className = 'particle-network-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)

  const c2d = canvas.getContext('2d')
  if (!c2d) return
  ctx = c2d
  resize()
  initParticles()

  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseout', onMouseOut, { passive: true })
  window.addEventListener('touchmove', onTouch, { passive: true })

  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseout', onMouseOut)
  window.removeEventListener('touchmove', onTouch)
  if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
  canvas = null
  ctx = null
  particles = []
})
</script>

<template>
  <!-- canvas 在 onMounted 中动态创建并挂到 body -->
</template>

<style scoped>
/* 无 markup */
</style>

<style>
/* 粒子网络背景 canvas：最底层装饰，screen 混合与主题背景叠加 */
.particle-network-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: screen;
}

html.dark .particle-network-canvas {
  mix-blend-mode: screen;
  opacity: 0.9;
}

/* 浅色模式下降低透明度，避免干扰阅读 */
html:not(.dark) .particle-network-canvas {
  opacity: 0.4;
}

@media (prefers-reduced-motion: reduce) {
  .particle-network-canvas {
    display: none;
  }
}
</style>

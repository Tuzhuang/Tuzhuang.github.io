<script setup lang="ts">
/**
 * 粒子连线网络背景 - 原博主原版实现
 * 来源：https://www.cnblogs.com/zhangshuhao1116/p/14914078.html
 *
 * "跟原博主一样的方法"：
 *  - 代码完全取自帖子里的 IIFE，变量名、算法、参数读取机制不做任何修改
 *  - 原代码会从它所在的 <script> 标签上读自定义属性来配置：
 *      zIndex   画布 z-index（默认 -1）
 *      opacity  画布 CSS opacity（原代码默认"3"，CSS会自动 clamp 到 1）
 *      color    连线与粒子点的 RGB 字符串，默认 "255,0,0"（正红）
 *      count    粒子总数，默认 160
 *  - 这里通过在动态创建的 script 标签上 setAttribute 来传参，
 *    颜色改用博客主题蓝 "30,128,255"，粒子数降到 130 以免卡顿，
 *    其余逻辑保持原博主原汁原味
 */
import { onMounted, onBeforeUnmount } from 'vue'

let canvasId: string | null = null
let scriptEl: HTMLScriptElement | null = null

// 原帖代码（从帖子里拷贝的 IIFE 原文，逐字保留，未做改动）
const ORIGINAL_SCRIPT = `
!function(){
function n(n,e,t){
return n.getAttribute(e)||t
}
function e(n){
return document.getElementsByTagName(n)
}
function t(){
var t=e("script"),o=t.length,i=t[o-1];
return{
l:o,z:n(i,"zIndex",-1),o:n(i,"opacity",3),c:n(i,"color","255,0,0"),n:n(i,"count",160)
}
}
function o(){
a=m.width=window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth,
c=m.height=window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight
}
function i(){
r.clearRect(0,0,a,c);
var n,e,t,o,m,l;
s.forEach(function(i,x){
for(i.x+=i.xa,i.y+=i.ya,i.xa*=i.x>a||i.x<0?-1:1,i.ya*=i.y>c||i.y<0?-1:1,r.fillRect(i.x-.5,i.y-.5,1,1),e=x+1;e<u.length;e++)n=u[e],
null!==n.x&&null!==n.y&&(o=i.x-n.x,m=i.y-n.y,
l=o*o+m*m,l<n.max&&(n===y&&l>=n.max/2&&(i.x-=.03*o,i.y-=.03*m),
t=(n.max-l)/n.max,r.beginPath(),r.lineWidth=t/2,r.strokeStyle="rgba("+d.c+","+(t+.2)+")",r.moveTo(i.x,i.y),r.lineTo(n.x,n.y),r.stroke()))
}),
x(i)
}
var a,c,u,m=document.createElement("canvas"),
d=t(),l="c_n"+d.l,r=m.getContext("2d"),
x=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||
function(n){
window.setTimeout(n,1e3/45)
},
w=Math.random,y={x:null,y:null,max:2e4};m.id=l,m.style.cssText="position:fixed;top:0;left:0;z-index:"+d.z+";opacity:"+d.o,e("body")[0].appendChild(m),o(),window.onresize=o,
window.onmousemove=function(n){
n=n||window.event,y.x=n.clientX,y.y=n.clientY
},
window.onmouseout=function(){
y.x=null,y.y=null
};
for(var s=[],f=0;d.n>f;f++){
var h=w()*a,g=w()*c,v=2*w()-1,p=2*w()-1;s.push({x:h,y:g,xa:v,ya:p,max:6e3})
}
u=s.concat([y]),
setTimeout(function(){i()},100)
}();
`

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // 创建一个 <script> 标签，设置自定义属性（模拟原博主把代码写在带属性的 script 标签中的写法）
  scriptEl = document.createElement('script')
  scriptEl.setAttribute('zIndex', '0')
  scriptEl.setAttribute('opacity', '0.55')
  // 主题蓝 #1e80ff = rgb(30,128,255)；要原博主默认正红就改回 "255,0,0"
  scriptEl.setAttribute('color', '30,128,255')
  scriptEl.setAttribute('count', '130')
  scriptEl.textContent = ORIGINAL_SCRIPT
  document.body.appendChild(scriptEl)

  // canvas id 是原代码里按 script 顺序计算出来的，这里尝试根据前缀找一下
  // 用于卸载时清理 canvas，避免残留
  canvasId = Array.from(document.getElementsByTagName('canvas'))
    .map((c) => c.id)
    .find((id) => id.startsWith('c_n')) || null
})

onBeforeUnmount(() => {
  // 移除注入的脚本
  if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl)
  scriptEl = null
  // 如果我们知道 id，就直接按 id 删；不知道就兜底，把所有带 c_n 前缀的 canvas 清掉
  const allCanvas = Array.from(document.getElementsByTagName('canvas'))
  const target = canvasId
    ? document.getElementById(canvasId) as HTMLCanvasElement | null
    : allCanvas.find((c) => c.id.startsWith('c_n') && c.className !== 'mouse-trail-canvas')
  if (target && target.parentNode) target.parentNode.removeChild(target)
  canvasId = null
})
</script>

<template>
  <!-- 无 DOM，脚本在 onMounted 里动态注入 -->
</template>

<style scoped>
/* 无 markup；原代码自己设置了 canvas.style.cssText = position:fixed;top:0;left:0;... */
</style>

<style>
/* 统一调整 canvas 的混合模式，避免深色背景下太突兀 */
canvas[id^='c_n'] {
  pointer-events: none !important;
  mix-blend-mode: screen;
}

html:not(.dark) canvas[id^='c_n'] {
  opacity: 0.35 !important; /* 浅色下再降低一点，避免盖住文字 */
}

@media (prefers-reduced-motion: reduce) {
  canvas[id^='c_n'] {
    display: none !important;
  }
}
</style>

---
title: 掘金沸点
sidebar: false
aside: false
outline: false
comment: false
---

<script setup>
import PinWall from './.vitepress/theme/components/PinWall.vue'
import pinData from './.vitepress/theme/data/pin.json'

const totalCount = pinData?.length ?? 0
const d = new Date()
const lastSync = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
</script>

<div class="pin-page">

# 沸点专区

<div class="pin-intro">
  <div class="pin-intro-main">
    同步自掘金博主 <strong>备孕不写bug</strong> 的最新动态，每条沸点支持原帖跳转。
  </div>
  <div class="pin-intro-meta">
    <span class="meta-item"><span class="meta-dot" /> 数据来源：掘金沸点 API</span>
    <span class="meta-divider" />
    <span class="meta-item">共 <strong>{{ totalCount }}</strong> 条</span>
    <span class="meta-divider" />
    <span class="meta-item">更新于 <strong>{{ lastSync }}</strong></span>
  </div>
</div>

<PinWall :limit="184" />

</div>

<style scoped>
.pin-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px 48px;
}
.pin-page h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
}
.pin-intro {
  margin: 0 0 24px;
  padding: 14px 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  border-left: 3px solid var(--vp-c-brand-1);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.pin-intro-main {
  font-size: 14px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
  flex: 1 1 auto;
  min-width: 240px;
}
.pin-intro-main strong {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.pin-intro-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta-item strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
  margin: 0 2px;
}
.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00d4aa;
  box-shadow: 0 0 6px rgba(0, 212, 170, 0.5);
}
.meta-divider {
  width: 1px;
  height: 12px;
  background: var(--vp-c-divider);
}
@media (max-width: 640px) {
  .pin-intro {
    flex-direction: column;
    align-items: flex-start;
  }
  .meta-divider {
    display: none;
  }
}
</style>
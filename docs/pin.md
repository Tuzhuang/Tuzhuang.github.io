---
title: 掘金沸点
sidebar: false
aside: false
outline: false
comment: false
---

<script setup>
import PinWall from './.vitepress/theme/components/PinWall.vue'
</script>

<div class="pin-page">

# 沸点专区

<p class="pin-intro">
  同步自掘金博主 <strong>备孕不写bug</strong> 的最新动态，每条沸点支持原帖跳转。
</p>

<PinWall :limit="184" />

</div>

<style scoped>
.pin-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 0 48px;
}
.pin-page h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
}
.pin-intro {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
.pin-intro strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}
</style>

<script setup lang="ts">
/**
 * Hero 之后的内容包装器
 *  - 默认渲染 PinWallCompact（可通过 props 关闭）
 *  - 用户可在插槽中传入其他内容
 */
import PinWallCompact from './PinWallCompact.vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  showPinWall?: boolean
  pinLimit?: number
}>(), {
  showPinWall: false,
  pinLimit: 6
})
</script>

<template>
  <div class="hero-after-wrap">
    <slot />
    <PinWallCompact v-if="showPinWall" :limit="pinLimit" />
  </div>
</template>

<style scoped>
.hero-after-wrap {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}
</style>
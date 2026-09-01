<script setup lang="ts">
/**
 * 沸点紧凑预览（首页中间区域用）
 * 复用 PinWall 数据，但布局更紧凑：
 *  - 三列卡片网格
 *  - 限制显示条数
 *  - 显示更多 CTA
 */
import { computed, ref } from 'vue'
import pinData from '../data/pin.json'

interface PinItem {
  msg_id: string
  content: string
  pic_list: string[]
  url: string
  url_title: string
  ctime: string
  comment_count: number
  digg_count: number
  topic_title: string
  author: {
    user_name: string
    avatar: string
    company: string
    jcode_title: string
  }
}

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 6 })

const pins = (pinData as unknown as PinItem[]).slice(0, props.limit)

function splitContent(raw: string) {
  const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/s)
  if (!m) return { body: raw }
  return { body: m[2] }
}

function fmtTime(ctime: string | number) {
  const ts = Number(ctime) * 1000
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '刚刚'
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)} 天前`
  if (sec < 86400 * 365) return `${Math.floor(sec / (86400 * 30))} 个月前`
  return `${Math.floor(sec / (86400 * 365))} 年前`
}

// 总沸点数据量（来自完整列表）
const totalCount = computed(() => (pinData as unknown as PinItem[]).length)
</script>

<template>
  <section class="pin-compact" aria-label="掘金沸点">
    <header class="section-head">
      <div class="head-left">
        <h2 class="title">
          <span class="emoji">📌</span>
          掘金沸点
          <span class="subtitle">同步自 备孕不写bug 的动态</span>
        </h2>
      </div>
      <a href="/pin/" class="more-link">
        查看全部 {{ totalCount }} 条沸点
        <span class="arrow">→</span>
      </a>
    </header>

    <div class="pin-grid">
      <a
        v-for="pin in pins"
        :key="pin.msg_id"
        :href="`https://juejin.cn/pin/${pin.msg_id}`"
        target="_blank"
        rel="noopener"
        class="pin-item"
      >
        <header class="item-head">
          <img class="item-avatar" :src="pin.author.avatar" :alt="pin.author.user_name" />
          <div class="item-meta">
            <div class="item-name">
              {{ pin.author.user_name }}
              <span class="item-badge">{{ pin.author.jcode_title }}</span>
            </div>
            <div class="item-sub">
              <span>{{ pin.author.company }}</span>
              <span class="dot">·</span>
              <span>{{ fmtTime(pin.ctime) }}</span>
            </div>
          </div>
        </header>

        <p class="item-text">
          {{ splitContent(pin.content).body }}
        </p>

        <div v-if="pin.pic_list.length" class="item-pics">
          <img
            v-for="(p, idx) in pin.pic_list.slice(0, 3)"
            :key="idx"
            :src="p"
            :alt="`图片${idx + 1}`"
            loading="lazy"
          />
          <div v-if="pin.pic_list.length > 3" class="pic-mask">
            +{{ pin.pic_list.length - 3 }}
          </div>
        </div>

        <footer class="item-foot">
          <span v-if="pin.topic_title" class="topic-tag">#{{ pin.topic_title }}</span>
          <span class="topic-spacer" />
          <span class="meta">💬 {{ pin.comment_count }}</span>
          <span class="meta">👍 {{ pin.digg_count }}</span>
        </footer>
      </a>
    </div>
  </section>
</template>

<style scoped lang="scss">
$primary: #1e80ff;
$primary-dark: #4dc3ff;
$bg-card: var(--card-bg, rgba(255, 255, 255, 0.6));
$border-soft: var(--border-soft, rgba(60, 60, 60, 0.08));
// 暗色模式适配：使用主题内置的次要文字色
$text-muted: var(--vp-c-text-2);
$text-muted-2: var(--vp-c-text-3, #9aa3b2);

.pin-compact {
  width: 100%;
  max-width: 960px;
  margin: 24px auto 0;
  padding: 0 4px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;

  .head-left {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--vp-c-text-1);
    display: flex;
    align-items: baseline;
    gap: 8px;

    .emoji {
      font-size: 22px;
    }

    .subtitle {
      font-size: 12px;
      font-weight: 400;
      color: $text-muted;
      margin-left: 6px;
    }
  }

  .more-link {
    font-size: 13px;
    color: $primary;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: gap 0.2s;

    :global(html.dark) & {
      color: $primary-dark;
    }

    &:hover {
      gap: 8px;
    }

    .arrow {
      transition: transform 0.2s;
    }
    &:hover .arrow {
      transform: translateX(2px);
    }
  }
}

.pin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media screen and (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media screen and (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.pin-item {
  background: $bg-card;
  border: 1px solid $border-soft;
  border-radius: 12px;
  padding: 14px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

  :global(html.dark) & {
    background: rgba(28, 28, 30, 0.85);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

    &:hover {
      box-shadow: 0 6px 18px rgba(77, 195, 255, 0.25);
      border-color: rgba(77, 195, 255, 0.4);
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(30, 128, 255, 0.12);
    border-color: rgba(30, 128, 255, 0.3);
  }
}

.item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.item-meta {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 1px;
}

.item-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  background: linear-gradient(135deg, #1e80ff, #4dc3ff);
  color: #fff;
  font-weight: 500;
}

.item-sub {
  font-size: 11px;
  color: $text-muted;
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot {
  opacity: 0.6;
  color: $text-muted-2;
}

.item-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  white-space: pre-wrap;
  min-height: 62px;
}

.item-pics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  position: relative;

  img {
    width: 100%;
    height: 60px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid $border-soft;

    :global(html.dark) & {
      border-color: rgba(255, 255, 255, 0.08);
    }
  }
}

.pic-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  pointer-events: none;
}

.item-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: $text-muted;

  :global(html.dark) & {
    color: #c0c4cc;
  }
}

.topic-tag {
  color: $primary;
  background: rgba(30, 128, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;

  :global(html.dark) & {
    color: $primary-dark;
    background: rgba(77, 195, 255, 0.18);
  }
}

.topic-spacer {
  flex: 1;
}

.meta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
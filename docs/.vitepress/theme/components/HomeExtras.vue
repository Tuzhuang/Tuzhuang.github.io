<script setup lang="ts">
/**
 * 首页 Hero 之后的装饰板块（精选卡片）
 *  - 数据栏（4 列，带 count-up）
 *  - 技能云（精简 pill）
 *  - 精选文章 CTA（卡片引导）
 */
import { ref, onMounted } from 'vue'

// 数据栏
const stats = ref([
  { value: 33, suffix: '+', label: '文章沉淀', color: '#36cfc9' },
  { value: 20, suffix: '+', label: '标签分类', color: '#1e80ff' },
  { value: 600, suffix: '+', label: '沸点动态', color: '#9254de' },
  { value: 0, suffix: '', label: '持续更新（天）', color: '#f759ab', start: new Date('2022-01-01') }
])

// 实际显示数字（动画值）
const displayValues = ref(stats.value.map(() => 0)
)

// 技能云（精简 8 个）
const skills = ['Vue', 'React', 'TypeScript', 'Vite', 'Node.js', 'Element Plus', 'VitePress', '工程化']

// 精选文章（手动列出 3 篇热门，可后续改自动）
const featuredPosts = [
  {
    title: '掘金沸点导入工具：从小工具到内容工作流',
    desc: '把沸点数据变成可沉淀、可搜索的内容资产',
    tag: '效率工具',
    date: '2026-09-01',
    href: '/juejin/others/掘金沸点导出与导入教程-1787797774079.html'
  },
  {
    title: 'GitHub Action 自动部署 VitePress',
    desc: '一个 commit 让博客自动发布，告别手动构建',
    tag: '工程化',
    date: '2026-08-30',
    href: '/backup-before-juejin-1787797774079/'
  },
  {
    title: '前端工程师的 Mac 工具箱 2026',
    desc: '按场景分类的常用工具，附带使用技巧',
    tag: '工具',
    date: '2026-08-25',
    href: '/about/site.html'
  }
]

// count-up 动画
onMounted(() => {
  // 计算持续天数
  if (stats.value[3].start) {
    stats.value[3].value = Math.max(
      1,
      Math.floor((Date.now() - stats.value[3].start.getTime()) / 86400000)
    )
  }

  // 触发数字递增动画
  const duration = 1200 // ms
  const start = performance.now()
  const targets = stats.value.map(s => s.value)

  function tick(now: number) {
    const p = Math.min(1, (now - start) / duration)
    // 缓动：ease-out cubic
    const ease = 1 - Math.pow(1 - p, 3)
    displayValues.value = targets.map(t => Math.round(t * ease))
    if (p < 1) requestAnimationFrame(tick)
    else displayValues.value = [...targets]
  }
  requestAnimationFrame(tick)
})
</script>

<template>
  <section class="home-extras" aria-label="个人简介与统计">
    <!-- ============= Hero 后 CTA 按钮组 ============= -->
    <div class="hero-cta">
      <a href="/juejin/" class="btn btn-primary">
        开始阅读
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </a>
      <a href="/about/site.html" class="btn btn-ghost">关于我</a>
      <a href="https://github.com/shaozhuangqi" target="_blank" rel="noopener" class="btn btn-ghost">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.95-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.18 1.83 1.18 3.09 0 4.43-2.7 5.41-5.26 5.69.41.35.78 1.04.78 2.1 0 1.52-.01 2.74-.01 3.11 0 .31.21.68.8.56C20.22 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>
        GitHub
      </a>
    </div>

    <!-- ============= 数据栏 4 列 ============= -->
    <div class="stats-grid">
      <div v-for="(s, i) in stats" :key="i" class="stat-card" :style="{ '--c': s.color }">
        <div class="stat-value">
          <span class="num">{{ displayValues[i] }}</span>
          <span class="suffix">{{ s.suffix }}</span>
        </div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- ============= 技能云 ============= -->
    <div class="skills-block">
      <div class="block-head">
        <h3 class="block-title">
          <span class="title-bar" />
          常玩的技术栈
        </h3>
        <span class="block-meta">// 8 项</span>
      </div>
      <div class="skills-cloud">
        <span v-for="s in skills" :key="s" class="skill-pill">{{ s }}</span>
      </div>
    </div>

    <!-- ============= 精选文章 CTA ============= -->
    <div class="featured-block">
      <div class="block-head">
        <h3 class="block-title">
          <span class="title-bar" />
          精选文章
        </h3>
        <a href="/juejin/" class="block-more">查看更多 →</a>
      </div>
      <div class="featured-grid">
        <a v-for="p in featuredPosts" :key="p.href" :href="p.href" class="post-card">
          <div class="post-meta">
            <span class="post-tag">{{ p.tag }}</span>
            <span class="post-date">{{ p.date }}</span>
          </div>
          <div class="post-title">{{ p.title }}</div>
          <div class="post-desc">{{ p.desc }}</div>
          <div class="post-arrow">阅读 →</div>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home-extras {
  width: 100%;
  max-width: 1100px;
  margin: 48px auto 0;
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 40px; // 加大模块间距
}

/* ============ Hero CTA 按钮组 ============ */
.hero-cta {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 999px;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.25s ease;
    border: 1px solid transparent;
    line-height: 1;
  }

  .btn-primary {
    color: #fff;
    background: linear-gradient(135deg, #1e80ff, #9254de);
    box-shadow: 0 6px 20px rgba(30, 128, 255, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(30, 128, 255, 0.45);
    }
  }

  .btn-ghost {
    color: var(--vp-c-text-1);
    background: var(--vp-c-bg-soft);
    border-color: var(--vp-c-divider);

    html.dark & {
      background: rgba(255, 255, 255, 0.05);
    }

    &:hover {
      border-color: var(--vp-c-brand-1);
      color: var(--vp-c-brand-1);
      transform: translateY(-2px);
    }
  }
}

/* ============ 数据栏 ============ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;

  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 420px) { grid-template-columns: 1fr 1fr; }
}

.stat-card {
  position: relative;
  padding: 28px 24px 24px;
  border-radius: 18px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;

  html.dark & {
    background: rgba(22, 27, 34, 0.7);
    backdrop-filter: blur(8px);
  }

  /* 顶部彩色条 */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--c), transparent);
    opacity: 0.7;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 32px rgba(30, 128, 255, 0.15);
  }
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  background: linear-gradient(135deg, var(--c), var(--vp-c-brand-3));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;

  .num {
    font-size: 42px; // 大数字，更有节奏
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .suffix {
    font-size: 24px;
    font-weight: 700;
    opacity: 0.7;
  }
}

.stat-label {
  margin-top: 10px;
  font-size: 13px;
  color: var(--vp-c-text-3);
  letter-spacing: 0.5px;
}

/* ============ 区块标题统一 ============ */
.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18px;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: var(--vp-c-text-1);
  text-transform: uppercase;
  font-family: 'JetBrains Mono', ui-monospace, monospace;

  .title-bar {
    display: inline-block;
    width: 24px;
    height: 2px;
    background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-3));
    border-radius: 2px;
  }
}

.block-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.block-more {
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover { color: var(--vp-c-brand-1); }
}

/* ============ 技能云 ============ */
.skills-block {
  padding: 28px 32px;
  border-radius: 18px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);

  html.dark & {
    background: rgba(22, 27, 34, 0.7);
    backdrop-filter: blur(8px);
  }
}

.skills-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-pill {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
  cursor: default;

  &:hover {
    background: var(--vp-c-brand-soft);
    border-color: var(--vp-c-brand-1);
    color: var(--vp-c-brand-1);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(30, 128, 255, 0.18);
  }
}

/* ============ 精选文章 ============ */
.featured-block {
  padding: 28px 32px;
  border-radius: 18px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);

  html.dark & {
    background: rgba(22, 27, 34, 0.7);
    backdrop-filter: blur(8px);
  }
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
}

.post-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  html.dark & {
    background: rgba(13, 17, 23, 0.6);
  }

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #36cfc9, #1e80ff, #9254de);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: var(--vp-c-brand-1);
    box-shadow: 0 14px 32px rgba(30, 128, 255, 0.18);

    &::before { transform: scaleY(1); }

    .post-arrow {
      color: var(--vp-c-brand-1);
      transform: translateX(4px);
    }

    .post-title {
      color: var(--vp-c-brand-1);
    }
  }
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
}

.post-tag {
  padding: 2px 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 4px;
  font-weight: 500;
}

.post-date {
  color: var(--vp-c-text-3);
  font-family: 'JetBrains Mono', monospace;
}

.post-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-top: 2px;
  transition: color 0.25s ease;
  line-height: 1.4;
}

.post-desc {
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  flex: 1;
}

.post-arrow {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  transition: color 0.25s ease, transform 0.25s ease;
  font-family: 'JetBrains Mono', monospace;
}
</style>
<script setup lang="ts">
/**
 * 沸点卡片列表（仿掘金沸点 UI，适配博客主题色）
 * 数据源：/docs/.vitepress/cache/pin.json
 * 渲染逻辑：
 *  - 解析 content 中的 [topic_id#topic_name#] 标签前缀
 *  - 单卡布局：头像 + 用户名 + 公司 + 杰出掘友徽章 + 时间
 *  - 中部：内容 + 话题标签 + 配图
 *  - 底部：分享 / 评论 / 点赞 三列
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useData } from "vitepress";

interface PinAuthor {
  user_name: string;
  avatar: string;
  company: string;
  description: string;
  jcode_title: string;
  level: number;
  power: number;
}
interface PinItem {
  msg_id: string;
  content: string;
  pic_list: string[];
  url: string;
  url_title: string;
  url_pic: string;
  ctime: string;
  comment_count: number;
  digg_count: number;
  hot_index: number;
  topic_title: string;
  topic_id: string;
  author: PinAuthor;
}

const props = withDefaults(
  defineProps<{
    /** 列表最大显示条数，默认 30 */
    limit?: number;
    /** 是否展示左侧"个人成就/侧栏"，仅在沸点专区页用到 */
    withSidebar?: boolean;
    /** 是否紧凑（首页中间区域用紧凑模式） */
    compact?: boolean;
    /** 是否展示每条沸点卡片头部的作者头像（侧栏已有时可关闭） */
    showPinAvatar?: boolean;
  }>(),
  {
    limit: 30,
    withSidebar: true,
    compact: false,
    showPinAvatar: true,
  },
);

// 当左侧有侧栏时，默认隐藏卡片头像，避免与侧栏头像重复
const shouldShowPinAvatar = computed(
  () => props.showPinAvatar && !props.withSidebar,
);

const { site } = useData();
const base = computed(() => site.value?.base ?? "/");

// 拿到本地 JSON（VitePress 会把 .vitepress/cache/ 整个目录复制到输出，但读取用相对路径）
// 这里通过 import 静态导入，避免运行时异步
import pinData from "../data/pin.json";
import commentData from "../data/pin-comments.json";
const pins = (pinData as unknown as PinItem[]).slice(0, props.limit);

// 评论：优先从构建期预拉取的静态 JSON 读取（绕开浏览器 CORS）
// 数据形如：{ [msg_id]: [{ id, content, ctime, digg, pics:[], replyCount, replies:[...], user:{...} }, ...] }
type StaticReply = {
  id: string;
  content: string;
  ctime: string;
  digg: number;
  pics: string[];
  replyToReplyId: string;
  replyToUserId: string;
  user: { name: string; avatar: string; company: string };
};
type StaticComment = {
  id: string;
  content: string;
  ctime: string;
  digg: number;
  pics: string[];
  replyCount: number;
  replies: StaticReply[];
  user: { name: string; avatar: string; company: string };
};
const staticComments = commentData as unknown as Record<
  string,
  StaticComment[]
>;

// 解析 content：[topic_id#topic_name#]剩余正文
function splitContent(raw: string) {
  const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (!m) return { topic: "", body: raw };
  const tag = m[1]; // "topic_id#topic_name"
  const body = m[2];
  const hashIdx = tag.indexOf("#");
  if (hashIdx < 0) return { topic: tag, body };
  return { topic: tag.slice(hashIdx + 1), body };
}

// 时间格式化（ctime 是秒）
function fmtTime(ctime: string | number) {
  const ts = Number(ctime) * 1000;
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "刚刚";
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)} 天前`;
  if (sec < 86400 * 365) return `${Math.floor(sec / (86400 * 30))} 个月前`;
  return `${Math.floor(sec / (86400 * 365))} 年前`;
}

// 折叠"展开/收起"
const expanded = ref<Set<string>>(new Set());
function toggleExpand(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id);
  else expanded.value.add(id);
  // 触发响应式更新
  expanded.value = new Set(expanded.value);
}

// 长内容阈值（紧凑模式更短）
const COLLAPSE_LEN = computed(() => (props.compact ? 90 : 140));

// ============= 评论展开相关 =============
interface CommentReply {
  reply_id: string;
  reply_info: {
    reply_id: string;
    reply_content: string;
    reply_pics: string[];
    ctime: string;
    digg_count: number;
    reply_to_reply_id: string;
    reply_to_user_id: string;
  };
  user_info: {
    user_name: string;
    avatar_large: string;
    company: string;
  };
}
interface CommentItem {
  comment_id: string;
  comment_info: {
    comment_id: string;
    comment_content: string;
    comment_pics: string[];
    ctime: string;
    digg_count: number;
    reply_count: number;
  };
  user_info: {
    user_name: string;
    avatar_large: string;
    company: string;
  };
  reply_infos: CommentReply[];
}

const expandedComments = ref<Set<string>>(new Set());
const comments = ref<Record<string, CommentItem[]>>({});
const commentLoading = ref<Set<string>>(new Set());
const commentError = ref<Record<string, string>>({});
// 哪些 comment 的回复被收起（默认展开，key 用 comment_id）
const collapsedReplies = ref<Set<string>>(new Set());

function toggleReplies(commentId: string) {
  if (collapsedReplies.value.has(commentId))
    collapsedReplies.value.delete(commentId);
  else collapsedReplies.value.add(commentId);
  collapsedReplies.value = new Set(collapsedReplies.value);
}

/**
 * 根据回复对象找到 user_name
 * 优先在同 comment 的回复列表里通过 reply_id 反查，回退为 comment 自身作者
 */
function resolveReplyToName(comment: CommentItem, reply: CommentReply): string {
  if (
    reply.reply_info.reply_to_reply_id &&
    reply.reply_info.reply_to_reply_id !== "0"
  ) {
    const target = (comment.reply_infos || []).find(
      (r) =>
        String(r.reply_info.reply_id) ===
        String(reply.reply_info.reply_to_reply_id),
    );
    if (target?.user_info?.user_name) return target.user_info.user_name;
  }
  // 直接回复主评论时，掘金的 reply_to_reply_id 通常为 "0"
  return comment.user_info.user_name || "";
}

async function loadComments(msgId: string) {
  if (comments.value[msgId]) return; // 已加载
  if (commentLoading.value.has(msgId)) return;
  commentLoading.value.add(msgId);
  commentLoading.value = new Set(commentLoading.value);

  // 1) 优先用构建期预拉取的静态评论，绕开浏览器 CORS
  const cached = staticComments[msgId];
  if (cached && cached.length) {
    comments.value[msgId] = cached.map((c) => ({
      comment_info: {
        comment_id: c.id,
        comment_content: c.content,
        comment_pics: c.pics || [],
        ctime: c.ctime,
        digg_count: c.digg || 0,
        reply_count: c.replyCount || 0,
      },
      user_info: {
        user_name: c.user?.name || "",
        avatar_large: c.user?.avatar || "",
        company: c.user?.company || "",
      },
      reply_infos: (c.replies || []).map((r) => ({
        reply_id: r.id,
        reply_info: {
          reply_id: r.id,
          reply_content: r.content,
          reply_pics: r.pics || [],
          ctime: r.ctime,
          digg_count: r.digg || 0,
          reply_to_reply_id: r.replyToReplyId || "0",
          reply_to_user_id: r.replyToUserId || "0",
        },
        user_info: {
          user_name: r.user?.name || "",
          avatar_large: r.user?.avatar || "",
          company: r.user?.company || "",
        },
      })),
    }));
    commentLoading.value.delete(msgId);
    commentLoading.value = new Set(commentLoading.value);
    return;
  }

  // 2) 回退：runtime 调掘金接口（仅当 json 没拉到时，且浏览器允许 CORS）
  try {
    const res = await fetch(
      "https://api.juejin.cn/interact_api/v1/comment/list",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_type: 1,
          item_id: msgId,
          cursor: "0",
          limit: 50,
          item_type: 4,
        }),
      },
    );
    const json = await res.json();
    if (json.err_no === 0 && json.data?.length) {
      comments.value[msgId] = json.data;
    } else if (json.err_no === 0) {
      comments.value[msgId] = [];
    } else {
      commentError.value[msgId] = json.err_msg || "加载失败";
    }
  } catch (e: any) {
    commentError.value[msgId] = e?.message || "网络异常";
  } finally {
    commentLoading.value.delete(msgId);
    commentLoading.value = new Set(commentLoading.value);
  }
}

async function toggleComments(msgId: string) {
  if (expandedComments.value.has(msgId)) {
    expandedComments.value.delete(msgId);
    expandedComments.value = new Set(expandedComments.value);
  } else {
    expandedComments.value.add(msgId);
    expandedComments.value = new Set(expandedComments.value);
    await loadComments(msgId);
  }
}

// ============= 图片预览弹框 =============
// 点击图片不再跳转掘金图床，直接在站内弹出大图预览
const viewer = ref<{
  visible: boolean;
  list: string[];
  index: number;
}>({ visible: false, list: [], index: 0 });

function openViewer(list: string[], index: number) {
  viewer.value = { visible: true, list: list.slice(), index };
  // 打开弹层时锁定 body 滚动，避免双重框错觉（背后卡片滚动残留视图）
  document.body.style.overflow = "hidden";
}
function closeViewer() {
  viewer.value.visible = false;
  document.body.style.overflow = "";
}
function prevPic() {
  const v = viewer.value;
  if (!v.list.length) return;
  v.index = (v.index - 1 + v.list.length) % v.list.length;
}
function nextPic() {
  const v = viewer.value;
  if (!v.list.length) return;
  v.index = (v.index + 1) % v.list.length;
}
function onViewerKey(e: KeyboardEvent) {
  if (!viewer.value.visible) return;
  if (e.key === "Escape") closeViewer();
  else if (e.key === "ArrowLeft") prevPic();
  else if (e.key === "ArrowRight") nextPic();
}

onMounted(() => window.addEventListener("keydown", onViewerKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onViewerKey));
</script>

<template>
  <div class="pin-wall" :class="{ compact, withSidebar }">
    <!-- 个人侧栏 -->
    <aside v-if="withSidebar" class="pin-aside">
      <div class="profile-card">
        <div class="profile-head">
          <button
            type="button"
            class="avatar-btn"
            :title="`查看 ${pins[0]?.author.user_name || ''} 的头像`"
            
          >
            <img
              class="avatar"
              :src="pins[0]?.author.avatar"
              :alt="pins[0]?.author.user_name"
            />
          </button>
          <div class="user-name">{{ pins[0]?.author.user_name }}</div>
          <div class="user-company">{{ pins[0]?.author.company }}</div>
          <div class="user-desc">{{ pins[0]?.author.description }}</div>
        </div>

        <div class="profile-section">
          <div class="section-title">个人成就</div>
          <div class="achievement-list">
            <div class="ach-row">
              <span class="ach-icon">⭐</span>
              <span class="ach-name">文章沸点</span>
              <span class="ach-value">{{ pins[0]?.author.power }}</span>
            </div>
            <div class="ach-row">
              <span class="ach-icon">💎</span>
              <span class="ach-name">掘金等级</span>
              <span class="ach-value">Lv{{ pins[0]?.author.level }}</span>
            </div>
            <div class="ach-row">
              <span class="ach-icon">🏆</span>
              <span class="ach-name">{{ pins[0]?.author.jcode_title }}</span>
              <span class="ach-value">96</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <div class="stat-row">
            <div class="stat-item">
              <span class="stat-num">2</span>
              <span class="stat-label">关注了</span>
            </div>
            <div class="stat-divider" />
            <div class="stat-item">
              <span class="stat-num">25</span>
              <span class="stat-label">关注者</span>
            </div>
            <div class="stat-divider" />
            <div class="stat-item">
              <span class="stat-num">4</span>
              <span class="stat-label">收藏集</span>
            </div>
          </div>
          <div class="join-time">
            <span class="join-icon">📅</span>
            <span class="join-label">加入于 2020-11-09</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 沸点流 -->
    <main class="pin-stream">
      <div v-for="pin in pins" :key="pin.msg_id" class="pin-card">
        <!-- 头部：用户名 + 标签（侧栏已有头像时隐藏卡片头像） -->
        <header class="pin-head" :class="{ 'no-avatar': !shouldShowPinAvatar }">
          <img
            v-if="shouldShowPinAvatar"
            class="pin-avatar"
            :src="pin.author.avatar"
            :alt="pin.author.user_name"
          />
          <div class="pin-meta">
            <div class="pin-user">
              <span class="pin-name">{{ pin.author.user_name }}</span>
              <span class="pin-badge">{{ pin.author.jcode_title }}</span>
            </div>
            <div class="pin-sub">
              <span>{{ pin.author.company }}</span>
              <span class="dot">·</span>
              <span>{{ fmtTime(pin.ctime) }}</span>
              <span v-if="pin.topic_title" class="dot">·</span>
              <span v-if="pin.topic_title" class="pin-topic-pill"
                >#{{ pin.topic_title }}</span
              >
            </div>
          </div>
        </header>

        <!-- 正文 -->
        <div class="pin-body" :class="{ expanded: expanded.has(pin.msg_id) }">
          <p class="pin-text">
            {{ splitContent(pin.content).body }}
            <a
              v-if="pin.url"
              :href="pin.url"
              target="_blank"
              rel="noopener"
              class="pin-ext-link"
            >
              {{ pin.url_title || "🔗 链接" }}
            </a>
          </p>
          <button
            v-if="splitContent(pin.content).body.length > COLLAPSE_LEN"
            class="expand-btn"
            @click="toggleExpand(pin.msg_id)"
          >
            {{ expanded.has(pin.msg_id) ? "收起" : "展开" }}
          </button>
        </div>

        <!-- 图片 -->
        <div
          v-if="pin.pic_list.length"
          class="pin-pics"
          :class="`count-${Math.min(pin.pic_list.length, 3)}`"
        >
          <button
            v-for="(p, idx) in pin.pic_list.slice(0, 9)"
            :key="idx"
            type="button"
            class="pic-trigger"
            :title="`查看图片 ${idx + 1}/${pin.pic_list.length}`"
            @click="openViewer(pin.pic_list, idx)"
          >
            <img :src="p" :alt="`图片${idx + 1}`" loading="lazy" />
          </button>
        </div>

        <!-- 底部：打开原帖 / 评论 / 点赞 -->
        <footer class="pin-foot">
          <a
            class="action open"
            :href="`https://juejin.cn/pin/${pin.msg_id}`"
            target="_blank"
            rel="noopener"
            title="去掘金查看原帖"
          >
            <span class="ico">🔗</span>
            <span class="txt">打开原帖</span>
          </a>
          <button
            class="action comment"
            :class="{ active: expandedComments.has(pin.msg_id) }"
            :title="expandedComments.has(pin.msg_id) ? '收起评论' : '展开评论'"
            @click="toggleComments(pin.msg_id)"
          >
            <span class="ico">💬</span>
            <span class="txt">{{ pin.comment_count }}</span>
          </button>
          <button class="action like" title="点赞数">
            <span class="ico">👍</span>
            <span class="txt">{{ pin.digg_count }}</span>
          </button>
        </footer>

        <!-- 评论区（点击展开后加载） -->
        <transition name="comment-fade">
          <div v-if="expandedComments.has(pin.msg_id)" class="pin-comments">
            <div v-if="commentLoading.has(pin.msg_id)" class="comment-loading">
              <span class="loading-dot" /><span class="loading-dot" /><span
                class="loading-dot"
              />
              <span class="loading-text">正在加载评论...</span>
            </div>
            <div v-else-if="commentError[pin.msg_id]" class="comment-empty">
              <span class="empty-icon">💭</span>
              <span>评论加载失败（{{ commentError[pin.msg_id] }}）</span>
            </div>
            <div
              v-else-if="(comments[pin.msg_id] || []).length === 0"
              class="comment-empty"
            >
              <span class="empty-icon">💭</span>
              <span>暂无评论</span>
            </div>
            <div v-else class="comment-list">
              <div
                v-for="c in comments[pin.msg_id]"
                :key="c.comment_id"
                class="comment-item"
              >
                <img
                  class="comment-avatar"
                  :src="c.user_info.avatar_large"
                  :alt="c.user_info.user_name"
                />
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-name">{{
                      c.user_info.user_name
                    }}</span>
                    <span v-if="c.user_info.company" class="comment-company">{{
                      c.user_info.company
                    }}</span>
                    <span class="comment-time">{{
                      fmtTime(c.comment_info.ctime)
                    }}</span>
                  </div>
                  <p class="comment-text">
                    {{ c.comment_info.comment_content }}
                  </p>
                  <div
                    v-if="c.comment_info.comment_pics?.length"
                    class="comment-pics"
                  >
                    <button
                      v-for="(p, idx) in c.comment_info.comment_pics"
                      :key="idx"
                      type="button"
                      class="pic-trigger"
                      :title="`查看图片 ${idx + 1}/${c.comment_info.comment_pics.length}`"
                      @click="openViewer(c.comment_info.comment_pics, idx)"
                    >
                      <img :src="p" :alt="`评论图${idx + 1}`" loading="lazy" />
                    </button>
                  </div>

                  <!-- 评论区对回复：默认全部展开（点击标题可折叠收起） -->
                  <template v-if="c.reply_infos && c.reply_infos.length">
                    <div class="comment-replies-header">
                      <button
                        type="button"
                        class="comment-replies-toggle"
                        @click="toggleReplies(c.comment_id)"
                      >
                        <span
                          class="arrow"
                          :class="{
                            open: !collapsedReplies.has(c.comment_id)
                          }"
                          >▸</span
                        >
                        <span
                          >共 {{ c.comment_info.reply_count || c.reply_infos.length }} 条回复</span
                        >
                      </button>
                    </div>
                    <div
                      v-if="!collapsedReplies.has(c.comment_id)"
                      class="comment-replies"
                    >
                      <div
                        v-for="r in c.reply_infos"
                        :key="r.reply_id"
                        class="reply-item"
                      >
                        <img
                          class="reply-avatar"
                          :src="r.user_info.avatar_large"
                          :alt="r.user_info.user_name"
                        />
                        <div class="reply-body">
                          <div class="reply-meta">
                            <span class="reply-name">{{
                              r.user_info.user_name
                            }}</span>
                            <span
                              v-if="r.user_info.company"
                              class="reply-company"
                              >{{ r.user_info.company }}</span
                            >
                            <span
                              v-if="
                                resolveReplyToName(c, r) &&
                                r.user_info.user_name !==
                                  resolveReplyToName(c, r)
                              "
                              class="reply-relation"
                              >回复 {{ resolveReplyToName(c, r) }}</span
                            >
                            <span class="reply-time">{{
                              fmtTime(r.reply_info.ctime)
                            }}</span>
                          </div>
                          <p class="reply-text">
                            {{ r.reply_info.reply_content }}
                          </p>
                          <div
                            v-if="r.reply_info.reply_pics?.length"
                            class="comment-pics"
                          >
                            <button
                              v-for="(p, idx) in r.reply_info.reply_pics"
                              :key="idx"
                              type="button"
                              class="pic-trigger"
                              :title="`查看图片 ${idx + 1}/${r.reply_info.reply_pics.length}`"
                              @click="openViewer(r.reply_info.reply_pics, idx)"
                            >
                              <img
                                :src="p"
                                :alt="`回复图${idx + 1}`"
                                loading="lazy"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </main>

    <!-- 图片预览弹层（点击图片站内放大，不跳转） -->
    <div v-if="viewer.visible" class="pic-viewer" @click.self="closeViewer">
      <button
        class="viewer-close"
        type="button"
        title="关闭（Esc）"
        @click="closeViewer"
      >
        ✕
      </button>
      <button
        v-if="viewer.list.length > 1"
        class="viewer-nav prev"
        type="button"
        title="上一张（←）"
        @click="prevPic"
      >
        ‹
      </button>
      <button
        v-if="viewer.list.length > 1"
        class="viewer-nav next"
        type="button"
        title="下一张（→）"
        @click="nextPic"
      >
        ›
      </button>
      <div class="viewer-stage" @click.stop>
        <img
          :src="viewer.list[viewer.index]"
          :alt="`图片 ${viewer.index + 1}/${viewer.list.length}`"
        />
        <div v-if="viewer.list.length > 1" class="viewer-counter">
          {{ viewer.index + 1 }} / {{ viewer.list.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$primary: #1e80ff;
$primary-dark: #4dc3ff;
$bg-card: var(--card-bg, rgba(255, 255, 255, 0.6));
$bg-card-hover: var(--card-bg-hover, rgba(255, 255, 255, 0.85));
$border-soft: var(--border-soft, rgba(60, 60, 60, 0.08));
// 暗色模式适配：使用主题内置的次要文字色（在暗色下也会自适应变亮）
$text-muted: var(--vp-c-text-2);
$text-muted-2: var(--vp-c-text-3, #9aa3b2);

.pin-wall {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  width: 100%;
  margin: 0 auto;
  max-width: 1200px;

  &.compact {
    max-width: 760px;
  }

  &.withSidebar {
    .pin-stream {
      flex: 1;
      min-width: 0;
    }
  }
}

/* 侧栏 - 个人卡片 */
.pin-aside {
  flex: 0 0 240px;
  position: sticky;
  top: 90px;

  @media screen and (max-width: 900px) {
    display: none;
  }
}

.profile-card {
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  padding: 24px 20px;
  border: 1px solid $border-soft;
  box-shadow: none;
  backdrop-filter: none;

  :global(html.dark) & {
    background: var(--vp-c-bg-soft);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: none;
  }
}

.profile-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-bottom: 20px;
  border-bottom: 1px solid $border-soft;

  :global(html.dark) & {
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.avatar-btn {
  display: block;
  padding: 0;
  margin: 0 0 14px;
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: zoom-in;
  line-height: 0;
  font-size: 0;

  &:focus-visible {
    outline: 2px solid $primary;
    outline-offset: 2px;
  }
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--vp-c-bg);
  box-shadow: 0 0 0 1px $border-soft;
  display: block;
}

.user-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 6px;
}

.user-company {
  font-size: 12px;
  color: $primary;
  margin-bottom: 8px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(30, 128, 255, 0.08);

  :global(html.dark) & {
    color: $primary-dark;
    background: rgba(77, 195, 255, 0.12);
  }
}

.user-desc {
  font-size: 13px;
  color: $text-muted;
  line-height: 1.6;
}

.profile-section {
  padding-top: 16px;
  border-bottom: 1px solid $border-soft;

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  :global(html.dark) & {
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 10px;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ach-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 13px;
  background: transparent;

  &:hover {
    background: rgba(30, 128, 255, 0.04);
  }

  :global(html.dark) & {
    background: transparent;

    &:hover {
      background: rgba(77, 195, 255, 0.06);
    }
  }

  .ach-icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
  }

  .ach-name {
    flex: 1;
    color: var(--vp-c-text-2);
  }

  .ach-value {
    color: $primary;
    font-weight: 600;

    :global(html.dark) & {
      color: $primary-dark;
    }
  }
}

// 统计 - 扁平一行
.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 2px;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: $border-soft;

  :global(html.dark) & {
    background: rgba(255, 255, 255, 0.08);
  }
}

.stat-num {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: $text-muted;
}

// 加入时间行
.join-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: $text-muted;
  padding: 0 0 16px;

  .profile-section:last-child & {
    padding-bottom: 0;
  }
}

.join-icon {
  font-size: 12px;
}

/* 沸点流 */
.pin-stream {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pin-card {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: none;
  border: 1px solid $border-soft;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(30, 128, 255, 0.35);
  }

  :global(html.dark) & {
    background: var(--vp-c-bg-soft);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: none;

    &:hover {
      border-color: rgba(77, 195, 255, 0.4);
    }
  }
}

.pin-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;

  &.no-avatar {
    margin-bottom: 10px;
  }
}

.pin-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.pin-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.pin-head.no-avatar .pin-meta {
  flex-direction: row;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 12px;

  .pin-user {
    margin-bottom: 0;
  }

  .pin-sub {
    font-size: 13px;
  }
}

.pin-user {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.pin-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.pin-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: linear-gradient(135deg, #1e80ff, #4dc3ff);
  color: #fff;
  font-weight: 500;
}

.pin-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;
}

.dot {
  color: $text-muted-2;
  opacity: 0.6;
}

.pin-topic-pill {
  color: $primary;
  font-weight: 500;

  :global(html.dark) & {
    color: $primary-dark;
  }
}

.pin-body {
  margin-bottom: 10px;
}

.pin-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  white-space: pre-wrap;

  .expanded & {
    display: block;
    -webkit-line-clamp: unset;
  }
}

.pin-ext-link {
  color: $primary;
  text-decoration: none;
  margin-left: 6px;

  :global(html.dark) & {
    color: $primary-dark;
  }

  &:hover {
    text-decoration: underline;
  }
}

.expand-btn {
  background: transparent;
  border: 0;
  color: $primary;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;

  :global(html.dark) & {
    color: $primary-dark;
  }

  &:hover {
    text-decoration: underline;
  }
}

/* 图片网格 */
.pin-pics {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;

  &.count-1 {
    grid-template-columns: 1fr;
    img {
      max-height: 360px;
      object-fit: cover;
    }
  }
  &.count-2 {
    grid-template-columns: 1fr 1fr;
    img {
      height: 200px;
      object-fit: cover;
    }
  }
  &.count-3 {
    grid-template-columns: 1fr 1fr 1fr;
    img {
      height: 160px;
      object-fit: cover;
    }
  }

  .pic-trigger {
    display: block;
    padding: 0;
    margin: 0;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid $border-soft;
    background: transparent;
    cursor: zoom-in;

    :global(html.dark) & {
      border-color: rgba(255, 255, 255, 0.08);
    }
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.04);
    }
  }
}

/* 底部操作栏 */
.pin-foot {
  display: flex;
  align-items: center;
  gap: 0;
  border-top: 1px dashed $border-soft;
  padding-top: 12px;
  margin-top: 8px;

  :global(html.dark) & {
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 0;
  padding: 6px 0;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.18s;
  text-decoration: none;

  .ico {
    font-size: 14px;
  }

  &:hover {
    background: rgba(30, 128, 255, 0.08);
    color: $primary;

    :global(html.dark) & {
      background: rgba(77, 195, 255, 0.15);
      color: $primary-dark;
    }
  }

  &.like {
    &:hover {
      color: #f56c6c;
      background: rgba(245, 108, 108, 0.08);

      :global(html.dark) & {
        background: rgba(245, 108, 108, 0.18);
      }
    }
  }

  &.open {
    color: $primary;

    :global(html.dark) & {
      color: $primary-dark;
    }

    &:hover {
      background: rgba(30, 128, 255, 0.12);
      color: $primary;

      :global(html.dark) & {
        background: rgba(77, 195, 255, 0.2);
        color: $primary-dark;
      }
    }
  }

  &.comment {
    &.active {
      color: $primary;
      background: rgba(30, 128, 255, 0.1);

      :global(html.dark) & {
        color: $primary-dark;
        background: rgba(77, 195, 255, 0.18);
      }
    }
  }
}

// 评论区
.pin-comments {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed $border-soft;

  :global(html.dark) & {
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.comment-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 0;
  color: $text-muted;
  font-size: 13px;

  .loading-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $primary;
    animation: bounce 1.4s infinite ease-in-out both;

    :global(html.dark) & {
      background: $primary-dark;
    }

    &:nth-child(2) {
      animation-delay: -0.32s;
    }
    &:nth-child(3) {
      animation-delay: -0.16s;
    }
  }

  .loading-text {
    margin-left: 6px;
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.comment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 0;
  color: $text-muted;
  font-size: 13px;

  .empty-icon {
    font-size: 28px;
    opacity: 0.6;
  }
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.02);
  transition: background 0.18s;

  :global(html.dark) & {
    background: rgba(255, 255, 255, 0.04);
  }

  &:hover {
    background: rgba(30, 128, 255, 0.05);

    :global(html.dark) & {
      background: rgba(77, 195, 255, 0.1);
    }
  }
}

.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
  flex-wrap: wrap;
}

.comment-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.comment-company {
  color: $primary;
  font-size: 11px;

  :global(html.dark) & {
    color: $primary-dark;
  }
}

.comment-time {
  color: $text-muted;
  margin-left: auto;
  font-size: 11px;
}

.comment-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-pics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 4px;
  margin-top: 6px;

  .pic-trigger {
    display: block;
    padding: 0;
    margin: 0;
    overflow: hidden;
    border-radius: 6px;
    border: 1px solid $border-soft;
    aspect-ratio: 1;
    background: transparent;
    cursor: zoom-in;

    :global(html.dark) & {
      border-color: rgba(255, 255, 255, 0.08);
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.05);
    }
  }
}

// 评论区中"查看 N 条回复"的折叠按钮
.comment-replies-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
  background: transparent;
  border: 0;
  color: $primary;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: opacity 0.18s;

  &:hover {
    opacity: 0.75;
  }

  .arrow {
    display: inline-block;
    transition: transform 0.2s ease;
    transform: rotate(0deg);
    font-size: 10px;

    &.open {
      transform: rotate(90deg);
    }
  }

  .meta-tip {
    color: $text-muted;
    font-size: 11px;
    margin-left: 2px;
  }

  :global(html.dark) & {
    color: $primary-dark;
  }
}

// 回复列表容器（嵌套在主评论下，左侧缩进，竖线分割）
.comment-replies {
  margin-top: 10px;
  margin-left: 8px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.025);
  border-radius: 8px;
  border-left: 2px solid $primary;
  display: flex;
  flex-direction: column;
  gap: 8px;

  :global(html.dark) & {
    background: rgba(255, 255, 255, 0.04);
    border-left-color: $primary-dark;
  }
}

.reply-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.reply-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid $border-soft;
}

.reply-body {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: $text-muted;
  margin-bottom: 2px;
}

.reply-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.reply-company {
  background: rgba(36, 137, 255, 0.1);
  color: $primary;
  padding: 0 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 1.6;

  :global(html.dark) & {
    background: rgba(77, 195, 255, 0.14);
    color: $primary-dark;
  }
}

.reply-relation {
  color: $text-muted;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.04);
  padding: 0 6px;
  border-radius: 3px;
}

.reply-time {
  font-size: 11px;
  color: $text-muted;
  margin-left: auto;
}

.reply-text {
  margin: 0;
  word-break: break-word;
  white-space: pre-wrap;
  color: var(--vp-c-text-2);
}

// 评论区展开动画
.comment-fade-enter-active,
.comment-fade-leave-active {
  transition: all 0.25s ease;
}
.comment-fade-enter-from,
.comment-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media screen and (max-width: 700px) {
  .pin-card {
    padding: 14px;
  }
  .pin-avatar {
    width: 36px;
    height: 36px;
  }
  .pin-text {
    font-size: 13px;
  }
}

/* ===== 图片预览弹层 ===== */
.pic-viewer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.96);
  backdrop-filter: blur(10px);

  :global(html.dark) & {
    background: #000;
  }
}

.viewer-stage {
  position: relative;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  /* 容器不限制宽度，由 img 自身尺寸决定，避免出现「框中框」视觉 */

  img {
    display: block;
    max-width: 92vw;
    max-height: 84vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border: 0;
    outline: 0;
    border-radius: 4px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    user-select: none;
    -webkit-user-drag: none;
  }
}

.viewer-counter {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.45);
  padding: 4px 12px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.viewer-close,
.viewer-nav {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 0;
  cursor: pointer;
  border-radius: 50%;
  transition:
    background 0.18s,
    transform 0.18s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.06);
  }

  &:active {
    transform: scale(0.95);
  }
}

.viewer-close {
  top: 24px;
  right: 28px;
  width: 40px;
  height: 40px;
  font-size: 18px;
}

.viewer-nav {
  top: 50%;
  width: 48px;
  height: 64px;
  font-size: 32px;
  margin-top: -32px;
  border-radius: 12px;
  line-height: 1;

  &.prev {
    left: 20px;
  }

  &.next {
    right: 20px;
  }
}

@media screen and (max-width: 700px) {
  .viewer-close {
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  .viewer-nav {
    width: 40px;
    height: 52px;
    font-size: 26px;
    margin-top: -26px;
  }
  .viewer-nav.prev {
    left: 8px;
  }
  .viewer-nav.next {
    right: 8px;
  }
}
</style>

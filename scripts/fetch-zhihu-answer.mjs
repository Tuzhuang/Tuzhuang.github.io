// 拉取指定知乎回答，生成一篇 Markdown 文章（问题标题 + 回答正文 + 图片）
//
// 用法：
//   1) 准备 cookie（二选一，均不进 git）
//      - 环境变量：ZHIHU_COOKIE="..."
//      - 文件：项目根目录 .zhihu-cookie（已在 .gitignore 中）
//   2) node scripts/fetch-zhihu-answer.mjs
//
// 说明：
//   - 知乎对未登录请求返回 403（zse-ck 风控），必须带登录态 cookie。
//   - 主路径：解析回答页 HTML 内嵌的 js-initialData（可同时拿到问题标题与回答正文）。
//   - 兜底：/api/v4/answers/<id> 配 x-api-version: 1.0.0。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ===== 配置区：按需修改 =====
const QUESTION_ID = '296119414'
const ANSWER_ID = '2176804078'
const OUTPUT_DIR = resolve(ROOT, 'docs', 'zhihu')
// ===========================

const ANSWER_URL = `https://www.zhihu.com/question/${QUESTION_ID}/answer/${ANSWER_ID}`
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function loadCookie() {
  const fromEnv = process.env.ZHIHU_COOKIE
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  const cookieFile = resolve(ROOT, '.zhihu-cookie')
  if (existsSync(cookieFile)) {
    const raw = readFileSync(cookieFile, 'utf8').trim()
    if (raw) return raw
  }
  return ''
}

function slugify(title, id) {
  const slug = title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
  return `${slug || 'zhihu'}-${id}`
}

const COOKIE = loadCookie()

async function httpGet(url, accept) {
  const res = await fetch(url, {
    headers: {
      'user-agent': UA,
      accept,
      'accept-language': 'zh-CN,zh;q=0.9',
      referer: ANSWER_URL,
      cookie: COOKIE
    }
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`http=${res.status} body=${text.slice(0, 200)}`)
  return text
}

const turndown = new TurndownService({ codeBlockStyle: 'fenced', bulletListMarker: '-' })
turndown.addRule('highlightedCode', {
  filter: (node) => node.nodeName === 'PRE',
  replacement: (content, node) => {
    const code = node.querySelector?.('code')
    const lang =
      code?.getAttribute('lang') || code?.getAttribute('class')?.match(/language-([\w-]+)/)?.[1] || ''
    const source = (code?.textContent || node.textContent || '').replace(/\r\n/g, '\n').trim()
    return `\n\n\`\`\`${lang}\n${source}\n\`\`\`\n\n`
  }
})

/**
 * 知乎回答 HTML 预处理：
 *  - <noscript> 里的图片提升到正文（知乎图片常藏在这里）
 *  - 统一 img 的 src（data-original / data-actualsrc / src）
 *  - 去掉脚本、样式与懒加载占位属性
 */
function htmlToMarkdown(html) {
  const $ = cheerio.load(html, null, false)
  const root = $.root()

  root.find('script,style').remove()

  // 知乎 figure 结构是： <noscript>真实img</noscript> + <img src="data:image/svg+xml..."> 懒加载占位
  // 两者 data-original 相同，若不先删占位图，展开 noscript 后同一张图会出现两次。
  root.find('img').each((_, el) => {
    const src = $(el).attr('src') || ''
    if (src.startsWith('data:image')) {
      $(el).remove()
    }
  })

  // 展开 noscript，把真实图片提升到正文
  root.find('noscript').each((_, el) => {
    const inner = $(el).html()
    if (inner) $(el).replaceWith(inner)
    else $(el).remove()
  })

  root.find('img').each((_, el) => {
    // 优先取高清原图 data-original，其次压缩图 data-actualsrc，最后 src
    const src =
      $(el).attr('data-original') || $(el).attr('data-actualsrc') || $(el).attr('src') || ''
    if (src) $(el).attr('src', src)
    $(el).removeAttr('data-original')
    $(el).removeAttr('data-actualsrc')
    $(el).removeAttr('data-size')
    $(el).removeAttr('data-rawwidth')
    $(el).removeAttr('data-rawheight')
    $(el).removeAttr('data-original-token')
    $(el).removeAttr('data-default-watermark-src')
    $(el).removeAttr('class')
    $(el).removeAttr('style')
  })

  return turndown
    .turndown(root.html() || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 主路径：从回答页 HTML 的 js-initialData 中提取问题与回答
 */
async function fetchViaHtml() {
  const html = await httpGet(ANSWER_URL, 'text/html,application/xhtml+xml')
  const m = html.match(/id="js-initialData"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) throw new Error('未找到 js-initialData')

  const data = JSON.parse(m[1].replace(/&quot;/g, '"'))
  const entities = data?.initialState?.entities
  if (!entities) throw new Error('initialData 中缺少 entities')

  const answer = entities?.answers?.[ANSWER_ID]
  const question = entities?.questions?.[QUESTION_ID]
  if (!answer) throw new Error(`entities.answers 中找不到 ${ANSWER_ID}`)

  return {
    title: question?.title || '',
    detail: question?.detail || '',
    content: answer.content || '',
    voteup: answer.voteup_count ?? 0,
    commentCount: answer.comment_count ?? 0,
    created: answer.created_time,
    updated: answer.updated_time,
    authorName: answer.author?.name || entities?.users?.[answer.author?.id]?.name || '匿名用户',
    headline: answer.author?.headline || entities?.users?.[answer.author?.id]?.headline || ''
  }
}

/**
 * 兜底：/api/v4/answers/<id>（需 x-api-version: 1.0.0，否则 10003）
 */
async function fetchViaApi() {
  const res = await fetch(
    `https://www.zhihu.com/api/v4/answers/${ANSWER_ID}?include=content,voteup_count,comment_count,created_time,updated_time,author,question`,
    {
      headers: {
        'user-agent': UA,
        accept: 'application/json,text/plain,*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        referer: ANSWER_URL,
        cookie: COOKIE,
        'x-api-version': '1.0.0'
      }
    }
  )
  const text = await res.text()
  if (!res.ok) throw new Error(`http=${res.status} body=${text.slice(0, 200)}`)
  const j = JSON.parse(text)
  if (j.error) throw new Error(`err=${j.error.code} ${j.error.message}`)

  return {
    title: j?.question?.title || '',
    detail: j?.question?.detail || '',
    content: j.content || '',
    voteup: j.voteup_count ?? 0,
    commentCount: j.comment_count ?? 0,
    created: j.created_time,
    updated: j.updated_time,
    authorName: j.author?.name || '匿名用户',
    headline: j.author?.headline || ''
  }
}

async function main() {
  if (!COOKIE) {
    console.error(
      '未找到 cookie。请设置环境变量 ZHIHU_COOKIE，或在项目根目录创建 .zhihu-cookie 文件。'
    )
    process.exit(1)
  }

  console.log(`[zhihu] 目标：${ANSWER_URL}`)

  let info
  try {
    info = await fetchViaHtml()
    console.log('[zhihu] 数据来源：HTML initialData')
  } catch (e) {
    console.warn(`[zhihu] HTML 方式失败（${e.message}），改用 API 兜底`)
    info = await fetchViaApi()
    console.log('[zhihu] 数据来源：API 兜底')
  }

  if (!info.content) throw new Error('回答正文为空')

  const date = info.created
    ? new Date(info.created * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const updated = info.updated ? new Date(info.updated * 1000).toISOString().slice(0, 10) : date

  console.log(`[zhihu] 问题：${info.title || '(未取到标题)'}`)
  console.log(`[zhihu] 作者：${info.authorName}${info.headline ? `（${info.headline}）` : ''}`)
  console.log(`[zhihu] 赞同 ${info.voteup} ｜ 评论 ${info.commentCount}`)

  const body = htmlToMarkdown(info.content)
  console.log(`[zhihu] 正文 ${body.length} 字符`)

  // 转义 {{ }}，避免被 Vite 当作模板语法解析
  const safeBody = body.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
  const safeTitle = (info.title || '知乎回答').replaceAll('\n', ' ')

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(safeTitle)}`,
    `date: ${date}`,
    `author: ${info.authorName}`,
    'tag:',
    '  - 知乎',
    `source: ${ANSWER_URL}`,
    '---',
    ''
  ].join('\n')

  // 文章结构：问题标题 + 元信息引用块 + 问题描述（若有）+ 回答正文
  const meta = [
    `> 来源：[知乎原回答](${ANSWER_URL})`,
    `> 作者：${info.authorName}${info.headline ? `（${info.headline}）` : ''}`,
    `> 赞同 ${info.voteup} ｜ 评论 ${info.commentCount} ｜ 更新于 ${updated}`
  ].join('\n> \n')

  const detailBlock = info.detail
    ? `\n## 问题描述\n\n${htmlToMarkdown(info.detail).replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')}\n`
    : ''

  const content = `${frontmatter}
# ${safeTitle}

${meta}
${detailBlock}
## 回答

${safeBody}

---

本文整理自知乎回答，版权归原作者所有。
`

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
  const file = resolve(OUTPUT_DIR, `${slugify(safeTitle, ANSWER_ID)}.md`)
  writeFileSync(file, content, 'utf8')
  console.log(`[zhihu] 已写入：${file}`)
}

main().catch((e) => {
  console.error('[zhihu] 失败：', e.message)
  process.exit(1)
})

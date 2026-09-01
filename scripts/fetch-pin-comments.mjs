// 构建时一次性拉取所有沸点的评论，生成 pin-comments.json
// 用法：node scripts/fetch-pin-comments.mjs
//
// 数据源：
//   沸点列表：docs/.vitepress/theme/data/pin.json（已含 msg_id 和 comment_count）
//   评论接口：https://api.juejin.cn/interact_api/v1/comment/list（POST JSON）
//
// 输出：docs/.vitepress/theme/data/pin-comments.json
//   形如：{ "<msg_id>": [CommentItem, ...], ... }

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PIN_JSON = resolve(__dirname, '..', 'docs', '.vitepress', 'theme', 'data', 'pin.json')
const OUTPUT = resolve(__dirname, '..', 'docs', '.vitepress', 'theme', 'data', 'pin-comments.json')
const API = 'https://api.juejin.cn/interact_api/v1/comment/list'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 抓取指定 msg_id 的全部评论（自动翻页直到 has_more=false）
 */
async function fetchAllComments(msgId) {
  const out = []
  let cursor = '0'
  let hasMore = true
  while (hasMore) {
    const body = {
      client_type: 1,
      item_id: msgId,
      cursor,
      limit: 50,
      item_type: 4,
      aid: '2608',
      uuid: '00000000-0000-0000-0000-000000000000',
      __web: true
    }
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
        referer: `https://juejin.cn/pin/${msgId}`,
        origin: 'https://juejin.cn'
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      console.warn(`[pin-comments] http=${res.status} msg=${msgId}`)
      break
    }
    const json = await res.json()
    if (json.err_no !== 0) {
      console.warn(`[pin-comments] err=${json.err_msg} msg=${msgId}`)
      break
    }
    out.push(...(json.data || []))
    hasMore = !!json.has_more
    cursor = String(json.cursor ?? '0')
    if (!hasMore) break
    // 简单限频，避免被掘金风控
    await new Promise((r) => setTimeout(r, 250))
  }
  return out
}

/**
 * 把一条 reply 简化到展示所需字段（保留 reply_to_user_id 以便前端拼 "回复 XX"）
 */
function pickReply(r) {
  const ri = r?.reply_info || {}
  const ui = r?.user_info || {}
  return {
    id: ri.reply_id,
    content: ri.reply_content || '',
    ctime: ri.ctime,
    digg: ri.digg_count || 0,
    pics: Array.isArray(ri.reply_pics) ? ri.reply_pics : [],
    replyToReplyId: ri.reply_to_reply_id || '0',
    replyToUserId: ri.reply_to_user_id || '0',
    user: {
      name: ui.user_name || '',
      avatar: ui.avatar_large || '',
      company: ui.company || ''
    }
  }
}

/**
 * 把掘金原始评论简化到仅前端需要的字段（减小 json 体积）
 */
function pick(c) {
  const ci = c.comment_info || {}
  const ui = c.user_info || {}
  return {
    id: ci.comment_id,
    content: ci.comment_content || '',
    ctime: ci.ctime,
    digg: ci.digg_count || 0,
    pics: Array.isArray(ci.comment_pics) ? ci.comment_pics : [],
    replyCount: ci.reply_count || 0,
    user: {
      name: ui.user_name || '',
      avatar: ui.avatar_large || '',
      company: ui.company || ''
    },
    replies: Array.isArray(c.reply_infos) ? c.reply_infos.map(pickReply) : []
  }
}

async function main() {
  const pins = JSON.parse(readFileSync(PIN_JSON, 'utf8'))
  const targets = pins.filter((p) => Number(p.comment_count) > 0)
  console.log(`[pin-comments] 总条数: ${pins.length}, 需拉评论: ${targets.length}`)

  const result = {}
  let i = 0
  for (const pin of targets) {
    i += 1
    try {
      const list = await fetchAllComments(pin.msg_id)
      if (list.length) {
        result[String(pin.msg_id)] = list.map(pick)
        console.log(
          `  [${i}/${targets.length}] msg=${pin.msg_id} -> ${list.length} 条`
        )
      } else {
        console.log(`  [${i}/${targets.length}] msg=${pin.msg_id} -> 0 (跳过)`)
      }
    } catch (e) {
      console.warn(`  [${i}/${targets.length}] msg=${pin.msg_id} 失败: ${e.message}`)
    }
    // 进度节流，避免触发风控
    await new Promise((r) => setTimeout(r, 300))
  }

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf8')
  console.log(`[pin-comments] 写入 ${OUTPUT}，共 ${Object.keys(result).length} 条沸点带评论`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

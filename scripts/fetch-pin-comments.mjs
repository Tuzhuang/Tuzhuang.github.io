// 构建时一次性拉取所有沸点的评论，生成 pin-comments.json
// 用法：node scripts/fetch-pin-comments.mjs
//
// 数据源：
//   沸点列表：docs/.vitepress/theme/data/pin.json（已含 msg_id 和 comment_count）
//   评论接口：https://api.juejin.cn/interact_api/v1/comment/list（POST JSON）
//   回复接口：https://api.juejin.cn/interact_api/v1/comment/reply/list（POST JSON）
//
// 输出：docs/.vitepress/theme/data/pin-comments.json
//   形如：{ "<msg_id>": [CommentItem, ...], ... }
//
// 注意：掘金 list 接口每条主评论只返回第一条子回复（reply_infos 长度 <=1），
// 真正的全部回复要针对每条主评论再调 reply/list 接口按 page_no 翻页。
//
// 已知限制：掘金用户沸点列表接口（content_api/v1/pin/*）已下线，
// 因此本脚本只刷新评论，不负责拉取沸点列表（pin.json 需另行维护）。

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PIN_JSON = resolve(__dirname, '..', 'docs', '.vitepress', 'theme', 'data', 'pin.json')
const OUTPUT = resolve(__dirname, '..', 'docs', '.vitepress', 'theme', 'data', 'pin-comments.json')
const LIST_API = 'https://api.juejin.cn/interact_api/v1/comment/list'
const REPLY_API = 'https://api.juejin.cn/interact_api/v1/comment/reply/list'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const AID = '2608'
const ITEM_TYPE = 4 // 沸点

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 通用 JSON POST，返回完整 json（保留 has_more / cursor 等分页字段）。
 * 带有限重试，降低偶发风控导致的整批失败。
 */
async function postJson(url, body, referer = 'https://juejin.cn/', retries = 2) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': USER_AGENT,
          referer,
          origin: 'https://juejin.cn'
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(`http=${res.status}`)
      const json = await res.json()
      if (json.err_no !== 0) throw new Error(json.err_msg || `err_no=${json.err_no}`)
      return json
    } catch (e) {
      lastErr = e
      if (attempt < retries) await sleep(1200 * (attempt + 1))
    }
  }
  throw lastErr
}

/**
 * 抓取指定 msg_id 下的全部主评论（按 has_more / cursor 翻页直到拉完）
 */
async function fetchAllComments(msgId) {
  const out = []
  let cursor = '0'
  let hasMore = true
  while (hasMore) {
    const json = await postJson(
      LIST_API,
      {
        client_type: 1,
        item_id: msgId,
        cursor,
        limit: 50,
        item_type: ITEM_TYPE,
        aid: AID,
        uuid: '00000000-0000-0000-0000-000000000000',
        __web: true
      },
      `https://juejin.cn/pin/${msgId}`
    )
    const list = json.data || []
    out.push(...list)
    hasMore = !!json.has_more
    cursor = String(json.cursor ?? '0')
    if (!hasMore || !list.length) break
    await sleep(350)
  }
  return out
}

/**
 * 针对一条主评论，抓取它下方的全部回复（按 page_no 翻页，直到 page_no*page_size >= count）
 * @param {string} commentId 主评论 id
 * @param {number} replyCount 该主评论的总回复数（来自 comment_info.reply_count）
 * @param {string} msgId 所属沸点 id，用于构造 referer
 */
async function fetchAllReplies(commentId, replyCount, msgId) {
  if (!replyCount) return []
  const pageSize = 50
  const pageCount = Math.ceil(replyCount / pageSize)
  const all = []
  for (let pageNo = 1; pageNo <= pageCount; pageNo++) {
    try {
      const json = await postJson(
        REPLY_API,
        {
          client_type: 1,
          comment_id: commentId,
          page_no: pageNo,
          page_size: pageSize,
          item_type: ITEM_TYPE,
          aid: AID,
          uuid: '00000000-0000-0000-0000-000000000000',
          __web: true
        },
        `https://juejin.cn/pin/${msgId}`,
        0 // 该路由已下线，失败立即返回，不浪费重试等待
      )
      // 回复接口形态：data 形如 { count, page_no, page_size, list: [...] }
      const data = json.data || {}
      const list = Array.isArray(data) ? data : Array.isArray(data.list) ? data.list : []
      all.push(...list)
      if (list.length < pageSize) break
      await sleep(300)
    } catch (e) {
      // 掘金 comment/reply/list 路由已下线（返回"请求路由不存在"）。
      // 这里必须降级而不是上抛，否则会连累主评论，导致整条沸点的评论全部丢失。
      if (pageNo === 1) {
        console.warn(`      (reply/list 不可用: ${e.message}；该评论仅保留 list 接口内联的回复)`)
      }
      break
    }
  }
  return all
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
  let ok = 0
  let empty = 0
  let fail = 0
  let i = 0
  let totalComments = 0
  let totalReplies = 0

  for (const pin of targets) {
    i += 1
    try {
      const list = await fetchAllComments(pin.msg_id)
      if (list.length) {
        // 对每条主评论，补抓它下方的全部回复（避免 list 接口只给首条 reply_infos 的坑）
        const picked = []
        for (const c of list) {
          const ci = c.comment_info || {}
          const replies = await fetchAllReplies(ci.comment_id, ci.reply_count || 0, pin.msg_id)
          // 兼容 list 接口返回的 reply_infos（首条）与新抓到的 replies，二者合并去重
          const inline = Array.isArray(c.reply_infos) ? c.reply_infos : []
          const merged = [...replies]
          for (const r of inline) {
            if (!merged.some((x) => (x?.reply_info?.reply_id || '') === (r?.reply_info?.reply_id || ''))) {
              merged.push(r)
            }
          }
          picked.push(pick({ ...c, reply_infos: merged }))
        }
        result[String(pin.msg_id)] = picked
        ok += 1
        totalComments += picked.length
        const replySum = picked.reduce((s, c) => s + (c.replies?.length || 0), 0)
        totalReplies += replySum
        console.log(
          `  [${i}/${targets.length}] msg=${pin.msg_id} -> ${picked.length} 评论 / ${replySum} 回复`
        )
      } else {
        empty += 1
        console.log(`  [${i}/${targets.length}] msg=${pin.msg_id} -> 0 (跳过)`)
      }
    } catch (e) {
      fail += 1
      console.warn(`  [${i}/${targets.length}] msg=${pin.msg_id} 失败: ${e.message}`)
    }
    // 进度节流，避免触发风控
    await sleep(500)
  }

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf8')
  console.log(`[pin-comments] 写入 ${OUTPUT}`)
  console.log(
    `[pin-comments] 带评论沸点 ${ok} 条 / 空 ${empty} 条 / 失败 ${fail} 条；累计 ${totalComments} 条评论、${totalReplies} 条回复`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

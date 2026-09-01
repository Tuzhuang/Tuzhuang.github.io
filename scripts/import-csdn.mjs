import fs from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

const root = process.cwd()
const docs = path.join(root, 'docs')
const outBase = path.join(docs, 'juejin')
const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }

// id -> { title, date(YYYY-MM-DD), category }
const articles = [
  { id: '147585302', title: 'vue项目prettier格式化代码，通过配置项，自动格式化代码格式', date: '2025-04-28', cat: 'vue' },
  { id: '128897857', title: '一些前端面试题，摘抄自一位大哥', date: '2023-02-08', cat: 'javascript' },
  { id: '123138493', title: 'vue cli3.0 怎么配置本地环境、生产环境地址，区别打包环境', date: '2022-02-25', cat: 'vue' },
  { id: '122721417', title: '我也不知道这是什么bug，困扰我两天', date: '2022-01-27', cat: 'javascript' },
  { id: '122177318', title: '用来测试的在线短视频地址', date: '2021-12-27', cat: 'other' },
  { id: '121659664', title: '点击文字怎么触发element-ui的查看大图功能', date: '2021-12-01', cat: 'javascript' },
  { id: '118783411', title: '有什么事什么话让你一瞬间感到孤独到哭？', date: '2021-07-16', cat: 'other' },
  { id: '118758783', title: '解决elementui表格边框错位问题', date: '2021-07-15', cat: 'javascript' },
  { id: '118702089', title: '使用elementui的nav-menu组件，把默认的icon图标替换成图片文件之后，图片不显示', date: '2021-07-13', cat: 'javascript' },
  { id: '112860124', title: '关于项目运行或者打包出现“primordials is not defined”导致运行或打包失败问题', date: '2021-01-20', cat: 'engineering-tools' },
  { id: '83796154', title: '用struts2框架做一个简单的图书的修改和查找', date: '2018-11-06', cat: 'other' },
  { id: '83717778', title: 'Struts2的国际化实例：中英文怎么转换？', date: '2018-11-04', cat: 'other' },
  { id: '83618698', title: 'struts2如何继承ActionSupport例子', date: '2018-11-01', cat: 'other' },
  { id: '83546642', title: '怎样搭建一个简易的Struts2项目呢', date: '2018-10-30', cat: 'other' },
]

function slugify(title, id) {
  const slug = title.toLowerCase().replace(/[^\u4e00-\u9fff\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
  return `${slug || 'article'}-${id}`
}

const turndown = new TurndownService({ codeBlockStyle: 'fenced', bulletListMarker: '-' })
turndown.addRule('highlightedCode', {
  filter: node => node.nodeName === 'PRE',
  replacement: (content, node) => {
    const code = node.querySelector?.('code')
    const lang = code?.getAttribute('lang')
      || code?.getAttribute('class')?.match(/language-([\w-]+)/)?.[1]
      || node.querySelector?.('.code-block-extension-lang')?.textContent?.trim()
      || ''
    const source = (code?.textContent || node.textContent || '')
      .replace(/\r\n/g, '\n').replace(/复制代码/g, '').trim()
    return `\n\n\`\`\`${lang}\n${source}\n\`\`\`\n\n`
  }
})

async function articleHtml(id) {
  const res = await fetch(`https://blog.csdn.net/shaozhuangGui/article/details/${id}`, { headers })
  if (!res.ok) throw new Error(`${res.status}`)
  const text = await res.text()
  const $ = cheerio.load(text)
  const root = $('#content_views')
  if (!root.length) throw new Error('article body #content_views not found')
  return root.html() || ''
}

function convertArticle(html) {
  const $ = cheerio.load(html, null, false)
  const root = $.root()
  root.find('style,script,.code-block-extension-top-bar,.hljs').remove()
  // 保留代码文本：去掉 span 高亮标签但保留文字
  root.find('pre code').each((_, el) => { $(el).html($(el).text()) })
  root.find('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src')
    if (src) $(el).attr('src', src)
    $(el).removeAttr('data-src').removeAttr('style')
  })
  return turndown.turndown(root.html() || '').replace(/\n{3,}/g, '\n\n').trim()
}

let ok = 0
for (const a of articles) {
  try {
    const html = await articleHtml(a.id)
    const body = convertArticle(html).replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;')
    const dir = path.join(outBase, a.cat)
    await fs.mkdir(dir, { recursive: true })
    const md = `---\ntitle: ${JSON.stringify(a.title)}\ndate: ${a.date}\nauthor: shaozhuangGui\ntag:\n  - 前端\nsource: https://blog.csdn.net/shaozhuangGui/article/details/${a.id}\n---\n\n${body}\n`
    await fs.writeFile(path.join(dir, `${slugify(a.title, a.id)}.md`), md)
    ok++
    console.log(`OK ${ok}/${articles.length}: ${a.title}`)
  } catch (e) {
    console.warn(`FAIL ${a.id} (${a.title}): ${e.message}`)
  }
}
console.log(`完成：成功 ${ok}/${articles.length}`)

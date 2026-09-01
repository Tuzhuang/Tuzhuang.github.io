// 抓取 CSDN 博主文章列表，提取 articleId 与标题
const username = 'shaozhuangGui'
const urls = [
  `https://blog.csdn.net/${username}/article/list/1`,
  `https://blog.csdn.net/${username}/article/list/2`,
  `https://blog.csdn.net/${username}/article/list/3`,
]
const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }

for (const u of urls) {
  try {
    const res = await fetch(u, { headers })
    const html = await res.text()
    const ids = new Set()
    const re = /article\/details\/(\d+)/g
    let m
    while ((m = re.exec(html))) ids.add(m[1])
    console.log('PAGE', u, 'status', res.status, 'ids', [...ids].length)
    for (const id of ids) console.log('  ', id)
  } catch (e) {
    console.log('ERR', u, e.message)
  }
}

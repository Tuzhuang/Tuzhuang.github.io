// 主题独有配置
import { getThemeConfig } from '@sugarat/theme/node'

// 开启RSS支持（RSS配置）
// import type { Theme } from '@sugarat/theme'

// const baseUrl = 'https://sugarat.top'
// const RSS: Theme.RSSOptions = {
//   title: '粥里有勺糖',
//   baseUrl,
//   copyright: 'Copyright (c) 2018-present, 粥里有勺糖',
//   description: '你的指尖,拥有改变世界的力量（大前端相关技术分享）',
//   language: 'zh-cn',
//   image: 'https://img.cdn.sugarat.top/mdImg/MTY3NDk5NTE2NzAzMA==674995167030',
//   favicon: 'https://sugarat.top/favicon.ico',
// }

const svgIconStr = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg t="1726881985964" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="16166" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200"><path d="M646.4512 627.5584m-298.1888 0a298.1888 298.1888 0 1 0 596.3776 0 298.1888 298.1888 0 1 0-596.3776 0Z" fill="#1296db" p-id="16167" data-spm-anchor-id="a313x.search_index.0.i3.71b33a81ouQI1D" class="selected"></path><path d="M467.6096 962.5088c-34.4064 0-68.7616-13.1072-94.976-39.2704l-276.48-276.48c-52.3776-52.3776-52.3776-137.5744 0-189.9008L465.4592 87.552a105.216 105.216 0 0 1 76.8512-30.6176l308.6336 8.3456c55.3472 1.4848 100.096 46.0288 101.7856 101.376l9.5744 310.1696c0.8704 28.7744-10.2912 56.9344-30.6176 77.2608l-369.2032 369.2032c-26.112 26.112-60.4672 39.2192-94.8736 39.2192z m71.8848-844.1856c-11.4176 0-22.4768 4.5568-30.5664 12.6464L139.6224 500.2752c-28.416 28.416-28.416 74.6496 0 103.0144l276.48 276.48c28.416 28.416 74.6496 28.416 103.0144 0l369.2032-369.2032a43.4176 43.4176 0 0 0 12.6464-31.8976l-9.5744-310.1696c-0.7168-22.8864-19.2-41.2672-42.0352-41.8816l-308.6336-8.3456c-0.4608 0.0512-0.8192 0.0512-1.2288 0.0512z" fill="#4F4F4F" p-id="16168"></path><path d="M676.4032 445.5424c-62.208 0-112.8448-50.6368-112.8448-112.8448s50.6368-112.8448 112.8448-112.8448c62.208 0 112.8448 50.6368 112.8448 112.8448s-50.6368 112.8448-112.8448 112.8448z m0-164.1984c-28.3648 0-51.4048 23.04-51.4048 51.4048s23.04 51.4048 51.4048 51.4048c28.3648 0 51.4048-23.04 51.4048-51.4048s-23.0912-51.4048-51.4048-51.4048z" fill="#4F4F4F" p-id="16169"></path></svg>'
// 所有配置项，详见文档: https://theme.sugarat.top/
const blogTheme = getThemeConfig({
  mermaid: true,
  // 开启RSS支持
  // RSS,

  // 搜索
  // 默认开启pagefind离线的全文搜索支持（如使用其它的可以设置为false）
  // search: false,

  // markdown 图表支持（会增加一定的构建耗时）
  // mermaid: true

  // 页脚
  footer: {
    // 隐藏主题版本标识
    version: false,
    // message 字段支持配置为HTML内容，配置多条可以配置为数组
    message: '行动力，是对平庸生活最好的回击',
    // copyright: 'MIT License | 张小海',
    // icpRecord: {
    //   name: '蜀ICP备19011724号',
    //   link: 'https://beian.miit.gov.cn/'
    // },
    // securityRecord: {
    //   name: '公网安备xxxxx',
    //   link: 'https://www.beian.gov.cn/portal/index.do'
    // },
  },

  //  配置了无效
  recommend: {
    title: '🔍 相关文章',
    nextText: '下一页',
    pageSize: 9,
    style: 'card',
    sort: 'date' // 按发布时间倒序排列，最新文章优先
    // empty: false // false时无推荐文章不展示此模块
  },

  // 主题色修改
  themeColor: 'el-blue',

  // 文章默认作者
  author: '张小海',

  hotArticle: {
    title: '🔥 精选文章',
    nextText: '下一页',
    pageSize: 9,
    empty: '暂无精选内容'
  },

  article: {
    /**
     * 是否展示文章的预计阅读时间
     */
    readingTime: true,
    /**
     * 是否隐藏文章页的封面展示
     */
    hiddenCover: false,
    /**
     * 阅读时间分析展示位置
     */
    readingTimePosition: 'inline',
    /**
     * 自定义一系列文案标题
     */
    // analyzeTitles: {
    //   inlineWordCount: '{{value}} word counts',
    //   inlineReadTime: '{{value}} min read time',
    //   wordCount: 'Total word count',
    //   readTime: 'Total read time',
    //   author: 'Author',
    //   publishDate: 'Published on',
    //   lastUpdated: 'Last updated on',
    //   tag: 'Tags',
    // }
  },

  // 关闭友情链接模块
  friend: false,

  homeTags: {
    title: '🏷️ 标签',
    limit: 12,
    showCount: true,
    sort: 'count'
  },

  // 公告
  // popover: {
  //   title: '公告',
  //   body: [
  //     { type: 'text', content: '👇公众号👇---👇 微信 👇' },
  //     {
  //       type: 'image',
  //       src: 'https://img.cdn.sugarat.top/mdImg/MTYxNTAxODc2NTIxMA==615018765210~fmt.webp'
  //     },
  //     {
  //       type: 'text',
  //       content: '欢迎大家加群&私信交流'
  //     },
  //     {
  //       type: 'text',
  //       content: '文章首/文尾有群二维码',
  //       style: 'padding-top:0'
  //     },
  //     {
  //       type: 'button',
  //       content: '作者博客',
  //       link: 'https://sugarat.top'
  //     },
  //     {
  //       type: 'button',
  //       content: '加群交流',
  //       props: {
  //         type: 'success'
  //       },
  //       link: 'https://theme.sugarat.top/group.html',
  //     }
  //   ],
  //   duration: 0
  // },
  // 关闭外部 Live2D 模型，避免网络资源加载失败时一直显示“正在加载”
  oml2d: false,
})

export { blogTheme }

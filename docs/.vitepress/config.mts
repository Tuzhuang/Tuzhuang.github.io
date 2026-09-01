import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'

// 如果使用 GitHub/Gitee Pages 等公共平台部署
// 通常需要修改 base 路径，通常为“/仓库名/”
// 如果项目名已经为 name.github.io 域名，则不需要修改！
// const base = process.env.GITHUB_ACTIONS === 'true'
//   ? '/vitepress-blog-sugar-template/'
//   : '/'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 继承博客主题(@sugarat/theme)
  extends: blogTheme,
  base: '/',
  // 首次访问默认使用暗色主题
  appearance: 'dark',
  // 文章中的示例地址（如 localhost）不是站内链接，不参与构建死链检查
  ignoreDeadLinks: true,
  lang: 'zh-cn',
  title: "Perry Blog",
  description: "A Personal Knowledge Base",
  lastUpdated: true,
  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    // 配置网站的图标（显示在浏览器的 tab 上）
    // ['link', { rel: 'icon', href: `${base}favicon.ico` }], // 修改了 base 这里也需要同步修改
    // 使用个人卡通头像生成的标准 ICO 作为浏览器标签页图标
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
  ],
  vite: {
    optimizeDeps: {
      include: ['@vue/shared']
    }
  },
  themeConfig: {
    // 展示 2,6 级标题在目录中
    outline: {
      level: [2, 6],
      label: '目录'
    },
    // 默认文案修改
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关文章',
    lastUpdatedText: '上次更新于',

    // 设置logo
    logo: '/logo.svg',
    // editLink: {
    //   pattern:
    //     'https://github.com/ATQQ/sugar-blog/tree/master/packages/blogpress/:path',
    //   text: '去 GitHub 上编辑内容'
    // },
    // TODO: 增加提效工具板块，常用的软件/AI工具，网站，插件等等。
    nav: [
      { text: '关于本博客', link: '/AboutMe.md' },
      { text: '沸点', link: '/pin/' },
      { text: '知乎', link: '/zhihu/' },
      {
        text: '笔记分类',
        items: [
          { text: 'Vue 与组件库', link: '/juejin/vue/' },
          { text: 'JavaScript 与 CSS', link: '/juejin/javascript/' },
          { text: '微信小程序与 UniApp', link: '/juejin/wechat-uniapp/' },
          { text: '工程化与开发工具', link: '/juejin/engineering-tools/' },
          { text: '网络与浏览器', link: '/juejin/web-network/' },
          { text: '移动端开发', link: '/juejin/mobile/' },
          { text: '其他技术笔记', link: '/juejin/other/' },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Tuzhuang'
      }
    ],
    
  }
})

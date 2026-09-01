import BlogTheme from '@sugarat/theme'
import Fireworks from './components/Fireworks.vue'
import PinWall from './components/PinWall.vue'
import PinWallCompact from './components/PinWallCompact.vue'

// 自定义样式重载
import './style.scss'

// 自定义主题色
// import './user-theme.css'
import { h } from 'vue'

export default {
    ...BlogTheme,
    Layout: h(BlogTheme.Layout, undefined, {
        'layout-top': () => h(Fireworks), // 在 layout-top 插槽中渲染 Fireworks 组件
        // 在首页 Hero 之后插入"沸点专区"中间区域内容（紧凑模式）
        'home-hero-after': () => h(PinWallCompact, { limit: 6 })
    }),
    enhanceApp({ app, router, siteData }) {
        app.component('Fireworks', Fireworks) // 注册 Fireworks 组件
        app.component('PinWall', PinWall) // 注册沸点列表组件
        app.component('PinWallCompact', PinWallCompact) // 注册沸点紧凑版组件（首页用）
    },
}
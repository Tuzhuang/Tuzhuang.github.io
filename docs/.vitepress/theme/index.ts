import BlogTheme from '@sugarat/theme'
import Fireworks from './components/Fireworks.vue'
import PinWall from './components/PinWall.vue'
import PinWallCompact from './components/PinWallCompact.vue'
import HomeExtras from './components/HomeExtras.vue'
import HeroAfter from './components/HeroAfter.vue'

// 自定义样式重载
import './style.scss'

// 自定义主题色
import './user-theme.css'
import { h } from 'vue'

// 首页"掘金沸点"紧凑区块开关（临时隐藏，置为 true 可恢复）
const showPinWall = false
// 首页装饰板块（个人简介 + 数据栏 + 技能云 + 时间线）开关
const showHomeExtras = true

export default {
    ...BlogTheme,
    Layout: h(BlogTheme.Layout, undefined, {
        'layout-top': () => h(Fireworks), // 在 layout-top 插槽中渲染 Fireworks 组件
        // 在首页 features 区（Hero 之后、BlogList 之前）插入装饰板块
        'home-features-after': () =>
            h(HeroAfter, { showPinWall, pinLimit: 6 }, {
                default: () => (showHomeExtras ? h(HomeExtras) : null)
            })
    }),
    enhanceApp({ app, router, siteData }) {
        app.component('Fireworks', Fireworks) // 注册 Fireworks 组件
        app.component('PinWall', PinWall) // 注册沸点列表组件
        app.component('PinWallCompact', PinWallCompact) // 注册沸点紧凑版组件（首页用）
        app.component('HomeExtras', HomeExtras) // 注册首页装饰板块
        app.component('HeroAfter', HeroAfter) // 注册 Hero 之后的内容包装器
    },
}
import BlogTheme from '@sugarat/theme'
import PinWall from './components/PinWall.vue'
import PinWallCompact from './components/PinWallCompact.vue'
import HomeExtras from './components/HomeExtras.vue'
import HeroAfter from './components/HeroAfter.vue'
import ParticleNetworkOriginal from './components/ParticleNetworkOriginal.vue'
// 注：以下装饰动效组件文件仍在 components/ 下，为缓解卡顿暂时停用；
//   恢复时：解除对应 import 注释 + 在 layout-top 数组补回 h() + 在 enhanceApp 中补回 app.component
// - MouseTrail.vue（鼠标粒子尾巴特效）
// - Fireworks.vue（点击烟花特效）
// - ParticleNetwork.vue（粒子连线网络背景 / 我自己 TS 重写版）
// - CoolBackground.vue（球面光带流动背景）

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
        'layout-top': () => h('div', { style: 'display: contents;' }, [h(ParticleNetworkOriginal)]), // 启用博客园原帖版本的粒子连线网络背景（组件内代码逐字搬自帖子 IIFE，仅通过 script 标签属性传参）
        // 在首页 features 区（Hero 之后、BlogList 之前）插入装饰板块
        'home-features-after': () =>
            h(HeroAfter, { showPinWall, pinLimit: 6 }, {
                default: () => (showHomeExtras ? h(HomeExtras) : null)
            })
    }),
    enhanceApp({ app, router, siteData }) {
        app.component('PinWall', PinWall) // 注册沸点列表组件
        app.component('PinWallCompact', PinWallCompact) // 注册沸点紧凑版组件（首页用）
        app.component('HomeExtras', HomeExtras) // 注册首页装饰板块
        app.component('HeroAfter', HeroAfter) // 注册 Hero 之后的内容包装器
        app.component('ParticleNetworkOriginal', ParticleNetworkOriginal) // 注册博客园原帖版粒子连线网络背景
        // MouseTrail / Fireworks / ParticleNetwork(重写版) / CoolBackground 装饰动效仍在组件列表中但暂不启用，可按需恢复
    },
}
---
title: "vue cli3.0 怎么配置本地环境、生产环境地址，区别打包环境"
date: 2022-08-31
author: 备孕不写bug
tag:
  - 前端
source: https://juejin.cn/post/7137924336748331045
---

# 标题首先，算了，直接说吧

我们在写vue项目的时候肯定会接触到多个地址，有本地环境地址和生产环境地址这个是最少的，然后项目里面应该怎么区分这些呢，我来告诉大家。

本文是根据vue cli3.0来的，vue cli2.0版本暂不支持

- 首先先在项目的根路径里面创建两个文件
- .env.development
- .env.production

# .env.development 文件内容

```env
NODE_ENV='development'
VUE_APP_MODE='development'
VUE_APP_URL='此为你本地的接口基地址'
```

# .env.production 文件内容

```env
NODE_ENV='production'
VUE_APP_MODE='production'
VUE_APP_URL='此为你线上的接口基地址'
```

- 然后在vue.config.js里面添加如下代码（如果没有这个文件的话，就在项目的根目录创建一个改文件）

```js
const path = require('path') //导入路径插件
// production 生产环境   development 本地环境
let isProduction = process.env.NODE_ENV == 'production',  //判断当前的环境
    baseUrl; //定义baseUrl
if (isProduction) {
    // 生产环境
    baseUrl = process.env.VUE_APP_URL  //当前就是生产环境baseUrl的地址
} else {
    baseUrl = process.env.VUE_APP_URL //当前就是开发环境baseUrl的地址
}

module.exports = {
	publicPath: './', //./：相对路径，history.pushState时避免使用相对路径
	// 当前配置就是打包后输出的文件夹，以便区分，所以做如下配置
    outputDir: process.env.NODE_ENV == "development" ? "test" : "dist", // 打包生成目录
    devServer: {
        proxy: {  //配置代理代理
            '^/api': {    // '^/api'别名（你的接口是以什么开头的就更换成什么，例如：^/orrce）
                target: baseUrl,
                ws: true, // 是否允许跨域
                changeOrigin: true
            }
        },
        hot: true, //保存实时刷新
    },
    css: {
        loaderOptions: {
            css: {},
            scss: {}
        }
    }
}
```

- 然后在package.json里面添加如下内容

```json
/* 在scripts里面添加如下代码 */
"scripts": {
	/* 在原有的配置后面添加 --mode development  代表默认启动本地环境的地址 */
    "serve": "vue-cli-service serve --mode development",
    /* 在原有的配置后面添加 --mode development  代表默认打包本地环境的地址 */
    "build": "vue-cli-service build --mode development",
    /* 在原有的配置后面添加 --mode production  代表默认启动生产环境的地址 */
    "serve-prod": "vue-cli-service serve --mode production",
    /* 在原有的配置后面添加 --mode production  代表默认打包生产环境的地址 */
    "build-prod": "vue-cli-service build --mode production"
  },
```

- 如果你封装了axios的话，在axios配置的基地址里面就直接写上动态的地址就可以了，如下

```js
let request = axios.create({
        baseURL: process.env.VUE_APP_URL,
        responseType: "json",
        timeout: 60000,
    });
```

最后这波配置就算是成功了

但是你怎么检测你的配置是否成功呢，只需要在main.js中打印当前环境的地址就是可以的

```js
console.log('当前地址',process.env.VUE_APP_URL)
```

打包成功的文件夹，在index.html中打开，如果是可以访问，并且接口都是可用的话，就代表整体配置成功了.
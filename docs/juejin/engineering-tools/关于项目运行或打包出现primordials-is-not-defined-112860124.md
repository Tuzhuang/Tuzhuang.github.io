---
title: "关于项目运行或者打包出现primordials is not defined导致运行或打包失败问题"
date: 2021-01-18
author: shaozhuangGui
tag:
  - 工程化
source: https://blog.csdn.net/shaozhuangGui/article/details/112860124
---

# 关于项目运行或者打包出现"PRIMORDIALS IS NOT DEFINED"导致运行或打包失败问题

在使用 gulp 的项目中遇到打包错误 `primordials is not defined`。通过升级 gulp 到 4.x 版本及以上可以解决此问题。具体步骤包括更新 gulp 到 4.0，安装 gulp-cli，执行 `npm run build` 进行打包。在 gulpfile.js 中，覆盖原有代码并执行一系列任务，如创建版本号目录、替换 CDN URL 和版本配置等。完成这些修改后，重新编译打包成功。

公司有一个项目，因为用到了 gulp，运行是可以正常运行，但是打包的时候就出现了 `primordials is not defined` 的报错信息，但是在代码中并没有找到 primordials，所以查阅了各种百度才找到问题。

**报错信息**

（注：原文此处应有报错截图）

**解决办法是将 gulp 依赖包升级到 4x 版本及以上就可以解决问题，所以大致步骤为：**

## 1. 升级 gulp 到 4.0

```bash
npm install -g gulp-cli
npm install --save-dev gulp@4
```

查看 gulp 版本：为 4x 以上版本即可：

```bash
gulp -v
```

## 2. 修改 gulpfile.js 文件

该文件在项目根目录中，与 `package.json` 同级。

将以下代码覆盖原本的代码：

```javascript
var gulp = require('gulp');
var $    = require('gulp-load-plugins')();
var path = require('path');
var del  = require('del');

var distPath    = path.resolve('./dist');
var version     = ''; // 版本号
var versionPath = ''; // 版本号路径
var env         = process.env.npm_config_qa ? 'qa' : process.env.npm_config_uat ? 'uat' : 'prod'; // 运行环境

// 创建版本号(年月日时分)
(function () {
  var d = new Date();
  var yy = d.getFullYear();
  var MM = d.getMonth() + 1 >= 10 ? (d.getMonth() + 1) : '0' + (d.getMonth() + 1);
  var DD = d.getDate() >= 10 ? d.getDate() : '0' + d.getDate();
  var h  = d.getHours() >= 10 ? d.getHours() : '0' + d.getHours();
  var mm = d.getMinutes() >= 10 ? d.getMinutes() : '0' + d.getMinutes();
  version = yy + MM + DD + h + mm;
  versionPath = distPath + '/' + version;
})();

// 编译
gulp.task('build', $.shell.task([ 'node build/build.js' ]));

// 创建版本号目录
gulp.task('create:versionCatalog', function () {
  return gulp.src(distPath + '/static/**/*')
    .pipe(gulp.dest(versionPath + '/static/'))
});

// 替换 ${versionPath}/static/js/manifest.js window.SITE_CONFIG.cdnUrl 占位变量
gulp.task('replace:cdnUrl', function () {
  return gulp.src(versionPath + '/static/js/manifest.js')
    .pipe($.replace(new RegExp('"' + require('./config').build.assetsPublicPath + '"', 'g'), 'window.SITE_CONFIG.cdnUrl + "/"'))
    .pipe(gulp.dest(versionPath + '/static/js/'))
});

// 替换 ${versionPath}/static/config/index-${env}.js window.SITE_CONFIG['version'] 配置变量
gulp.task('replace:version', function () {
  return gulp.src(versionPath + '/static/config/index-' + env + '.js')
    .pipe($.replace(/window.SITE_CONFIG\['version'\] = '.*'/g, "window.SITE_CONFIG['version'] = '" + version + "'"))
    .pipe(gulp.dest(versionPath + '/static/config/'))
});

// 合并 ${versionPath}/static/config/[index-${env}, init].js 至 ${distPath}/config/index.js
gulp.task('concat:config', function () {
  return gulp.src([versionPath + '/static/config/index-' + env + '.js', versionPath + '/static/config/init.js'])
    .pipe($.concat('index.js'))
    .pipe(gulp.dest(distPath + '/config/'))
});

// 清除, 编译 / 处理项目中产生的文件
gulp.task('cleanBuild', function () {
  return del([distPath + '/static', versionPath + '/static/config'])
});
// 清空
gulp.task('clean', function () {
  return del([versionPath])
});

// gulp.series | 4.0 依赖
// gulp.parallel | 4.0 多个依赖嵌套
gulp.task('default', gulp.series(gulp.series('build', 'create:versionCatalog', 'replace:cdnUrl', 'replace:version', 'concat:config', 'cleanBuild')));
```

> 注：原文代码块中使用了 ES6 模板字符串（`${xxx}`），为了避免与 VitePress 渲染机制冲突，此处改用字符串拼接写法，功能完全等价。

## 3. 最后重新编译进行打包

```bash
npm run build
```

出现大功告成的效果。
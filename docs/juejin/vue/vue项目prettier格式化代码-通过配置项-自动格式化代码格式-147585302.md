---
title: "vue项目prettier格式化代码，通过配置项，自动格式化代码格式"
date: 2026-04-21
author: shaozhuangGui
tag:
  - 前端
source: https://blog.csdn.net/shaozhuangGui/article/details/147585302
---

# VUE项目PRETTIER格式化代码，通过配置项，自动格式化代码格式

首先第一步安装插件 vscode 中。

然后在项目的根目录里面创建 `.prettierrc.cjs` 文件，在文件中新增下面代码：

```javascript
module.exports = {
  printWidth: 120, // 每行代码最大长度
  tabWidth: 2, //一个tab代表几个空格数，默认为80
  useTabs: false, //是否使用tab进行缩进，默认为false，表示用空格进行缩减
  semi: true, // 声明后带分号
  vueIndentStyle: true, //启用 Vue 缩进风格
  singleQuote: false, // 使用单引号
  jsxSingleQuote: false, // 使用单引号
  jsxBracketSameLine: true, // 启用jsx语法，> 放在末尾
  trailingComma: "all",
  htmlWhitespaceSensitivity: "strict", // 对 HTML 空白字符敏感
  endOfLine: "auto", // 在行尾自动添加分号
};
```

然后在 vue 代码里面右键通过这个配置项来设置。

然后再你项目的根目录里面创建 `.vscode` 文件夹，在里面创建 `settings.json` 文件，如果有的话直接进行修改即可。

最后在配置项里面添加上如下代码：

```json
{
	"editor.formatOnSave": true,
}
```

这样最后的结果应该只要你保存代码的时候，代码就会自动进行格式化，也是非常的奈斯！

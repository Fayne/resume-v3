# 个人简历网站（Git-based CMS）

技术栈：Vite + Vue 3 + Tailwind CSS 3 + vue-i18n（中/英双语，默认中文）

## 工作原理

- 简历内容存放在 `src/data/resume.json`，前台页面构建时直接读取渲染。
- 后台 `/admin` 页面是一个可视化的 Git 提交工具：在浏览器里编辑表单，点击"提交修改"后，
  通过 GitHub Contents API 直接向仓库提交一次 commit 更新 `resume.json`。
- Cloudflare Pages 监听到仓库 push 后自动重新构建部署（通常 30 秒 ~ 1 分钟）。
- 全程没有自建服务器，也没有使用任何付费服务。

## 本地开发

```bash
npm install
npm run dev
```

## 部署到 Cloudflare Pages

1. 把这个项目 push 到你的 GitHub 仓库。
2. 登录 Cloudflare Dashboard -> Workers & Pages -> 创建应用 -> Pages -> 连接到 Git。
3. 选择该仓库，构建配置：
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 部署完成后，在 Cloudflare Pages 项目的 "自定义域" 里绑定你的个人域名。

## 配置 GitHub Token（用于后台管理）

1. 打开 GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens。
2. 新建一个 token，只授权给这一个仓库，Repository permissions 里把 **Contents** 设为 **Read and write**，其余保持默认（No access）。
3. 打开你部署好的网站的 `/admin` 页面，把 token 和仓库（格式 `owner/repo`）填进去，点击"加载简历数据"。
4. Token 只保存在你自己浏览器的 localStorage 里，不会上传到任何服务器，但注意不要在公共电脑上登录后台，也不要把 token 提交进代码仓库。
5. 如果担心 token 泄露风险，可以定期在 GitHub 后台吊销并重新生成。

## 配置 Cloudinary（用于图片上传）

1. 登录 Cloudinary 后台 -> Settings -> Upload -> Upload presets -> Add upload preset。
2. Signing Mode 选择 **Unsigned**，保存后会得到一个 preset 名称。
3. 打开 `src/composables/useCloudinary.js`，把 `CLOUD_NAME` 和 `UPLOAD_PRESET` 换成你自己的值。

## 目录结构

```
src/
├── data/resume.json          # 简历数据（中英双语字段）
├── i18n/                     # 界面文案（中/英），默认中文
├── composables/
│   ├── useGithubApi.js       # 读取/提交 resume.json 到 GitHub
│   └── useCloudinary.js      # 图片上传到 Cloudinary
├── views/
│   ├── Home.vue              # 前台展示页
│   └── Admin.vue             # 后台管理页（增删改查表单）
└── router/                   # / 和 /admin 两个路由
```

## 双语内容说明

`resume.json` 里凡是需要展示的文本字段都写成 `{ "zh": "...", "en": "..." }` 的形式，
前台页面根据当前选择的语言自动取值；界面本身的固定文案（导航、按钮等）走 `vue-i18n`，
在 `src/i18n/locales/zh.json` 和 `en.json` 里维护。默认语言为中文，用户切换后会记住选择。

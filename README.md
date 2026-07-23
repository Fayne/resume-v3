# Developer Portfolio v2（Git-based CMS）

技术栈：Vite + Vue 3 + Tailwind CSS 3 + vue-i18n（中/英双语，默认中文）

## v2 架构

- 前台内容拆分在 `src/data/profile.json`、`skills.json`、`projects.json` 和 `timeline.json`；Git Diff 更清晰，且每个数据模型可独立演进。
- 前台构建不包含后台路由或后台链接；后台是独立的 `admin.html` 构建入口，作为可视化的 Git 提交工具。
- Cloudflare Pages 监听到仓库 push 后自动重新构建部署（通常 30 秒 ~ 1 分钟）。
- 全程没有自建服务器，也没有使用任何付费服务。

## Cloudflare Pages：两个项目、一个仓库

创建两个均连接同一 GitHub 分支的 Pages 项目：

| 项目 | Build command | Output directory | 域名 |
| --- | --- | --- | --- |
| 公开作品集 | `npm run build` | `dist` | `www.example.com` |
| 后台 | `npm run build:admin` | `dist-admin` | `admin.example.com` |

不要在公开站点部署 `dist-admin`，也不要为公开站点添加 `/admin` 路由。

## 用 Cloudflare Access 保护后台

1. 在 Cloudflare Zero Trust 中将 `admin.example.com` 添加为 **Self-hosted application**。
2. 添加 GitHub 为身份提供商。
3. 创建 Allow policy，只匹配你的 GitHub 账号（或严格控制的组织/团队）。
4. 将该策略绑定到 `admin.example.com`。

Access 会在返回 HTML 前阻止未授权请求；这比在前端实现登录更可靠。后台中的 Fine-grained GitHub Token 只存于 `sessionStorage`，关闭会话即失效，绝不可放入源码、`.env` 或 Cloudflare 变量。

## 本地开发

```bash
npm install
npm run dev
npm run build
npm run build:admin
```

## 部署到 Cloudflare Pages（公开站点）

1. 把这个项目 push 到你的 GitHub 仓库。
2. 登录 Cloudflare Dashboard -> Workers & Pages -> 创建应用 -> Pages -> 连接到 Git。
3. 选择该仓库，构建配置：
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 部署完成后，在 Cloudflare Pages 项目的 "自定义域" 里绑定你的个人域名。

## 配置 GitHub Token（用于后台管理）

1. 打开 GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens。
2. 新建一个 token，只授权给这一个仓库，Repository permissions 里把 **Contents** 设为 **Read and write**，其余保持默认（No access）。
3. 访问受 Cloudflare Access 保护的 `admin.example.com`，把 token 和仓库（格式 `owner/repo`）填进去，再选择内容文件加载。
4. Token 只保存在当前浏览器会话的 sessionStorage 里，不会上传到任何服务器；不要在公共电脑上登录后台，也不要把 token 提交进代码仓库。
5. 如果担心 token 泄露风险，可以定期在 GitHub 后台吊销并重新生成。

## 配置 Cloudinary（用于图片上传）

1. 登录 Cloudinary 后台 -> Settings -> Upload -> Upload presets -> Add upload preset。
2. Signing Mode 选择 **Unsigned**，保存后会得到一个 preset 名称。
3. 将 `.env.example` 的值设置为 Admin Pages 项目的环境变量；这些值仅用于 unsigned 上传配置。

## 目录结构

```
src/
├── data/                     # 分领域、双语的 Git 内容数据
│   ├── profile.json
│   ├── skills.json
│   ├── projects.json
│   └── timeline.json
├── i18n/                     # 界面文案（中/英），默认中文
├── composables/
│   ├── useGithubApi.js       # 读取/提交多个 JSON 到 GitHub
│   └── useCloudinary.js      # 图片上传到 Cloudinary
├── views/
│   ├── Home.vue              # 作品集、能力矩阵、时间轴和案例
│   └── Admin.vue             # 独立构建的内容提交页
└── router/                   # 公开站点仅有 /
```

## 双语内容说明

`resume.json` 里凡是需要展示的文本字段都写成 `{ "zh": "...", "en": "..." }` 的形式，
前台页面根据当前选择的语言自动取值；界面本身的固定文案（导航、按钮等）走 `vue-i18n`，
在 `src/i18n/locales/zh.json` 和 `en.json` 里维护。默认语言为中文，用户切换后会记住选择。

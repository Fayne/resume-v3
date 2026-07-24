# Developer Portfolio v2（Git-based CMS）

技术栈：Vite + Vue 3 + Tailwind CSS 3 + vue-i18n（中/英双语，默认中文）

## v2 架构

- 前台内容拆分在 `src/data/profile.json`、`skills.json`、`projects.json` 和 `timeline.json`；Git Diff 更清晰，且每个数据模型可独立演进。
- 前台构建不包含后台路由或后台链接；后台是独立的 `admin.html` 构建入口，作为可视化的 Git 提交工具。
- Cloudflare Pages 监听到仓库 push 后自动重新构建部署（通常 30 秒 ~ 1 分钟）。
- 全程没有自建服务器，也没有使用任何付费服务。

## Cloudflare：两个 Workers 项目、一个仓库

2026 年起 Cloudflare 对新项目默认推荐 "Workers + Static Assets"（用 `wrangler deploy` 部署），而不是经典 Pages（用 `wrangler pages deploy`）。这个仓库按这个新模式配置，分别给公开站点和后台各准备了一份 `wrangler.jsonc`：

| 项目 | Build command | Deploy command | 域名 |
| --- | --- | --- | --- |
| 公开作品集 | `npm run build` | `npx wrangler deploy --config wrangler.public.jsonc` | `www.example.com` |
| 后台 | `npm run build:admin` | `npx wrangler deploy --config wrangler.admin.jsonc` | `admin.example.com` |

在 Cloudflare Dashboard 分别创建两个 Workers 项目，都连接同一个 GitHub 仓库/分支，按上表分别填 Build command 和 Deploy command（在项目的 Settings -> Build 里可以覆盖默认值）。不要在公开站点的配置里指向 `dist-admin`。

## 保护后台：Basic Auth Worker（不需要信用卡）

Cloudflare Access / Zero Trust 即使选 Free 计划，注册时也会强制要求绑定一张支付卡。如果你没有卡，可以跳过 Access，改用仓库里已经写好的 `worker/index.js`：它会在返回任何静态文件之前，先检查请求的 HTTP Basic Auth 是否匹配，不匹配直接 401。

1. 打开后台对应的 Workers 项目 -> Settings -> Variables and Secrets，添加两个变量：`ADMIN_USER`、`ADMIN_PASSWORD`（建议把 Password 类型的变量加密存储）。
2. 保存后重新部署一次，让新的环境变量生效。
3. 之后访问 `admin.example.com` 时，浏览器会弹出系统自带的登录框，输错会一直卡在 401。

这是单一共享密码，没有身份提供商、没有登录审计、没有设备策略，安全等级比 Cloudflare Access 低；但配合后台本身需要的 Fine-grained GitHub Token（没有 token 光登进来也无法真正写仓库），对个人项目来说是合理的折中。如果以后办了信用卡、想升级成 Cloudflare Access，把 `wrangler.admin.jsonc` 里和 `worker/index.js` 相关的配置删掉、把 `admin.example.com` 加进 Zero Trust 的 Self-hosted application 就行。

## 本地开发

```bash
npm install
npm run dev
npm run dev:admin
npm run build
npm run build:admin
```

本地内容管理地址为 `http://localhost:5173/admin.html`。开发模式默认启用“直接修改本地 JSON”，保存时只允许写入 `profile.json`、`skills.json`、`projects.json` 和 `timeline.json`；该写入接口仅由 Vite 开发服务器提供，不存在于生产构建。

## 配置 GitHub Token（用于后台管理）

1. 打开 GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens。
2. 新建一个 token，只授权给这一个仓库，Repository permissions 里把 **Contents** 设为 **Read and write**，其余保持默认（No access）。
3. 用刚才设置的 `ADMIN_USER`/`ADMIN_PASSWORD` 登录 `admin.example.com`，把 token 和仓库（格式 `owner/repo`）填进去，再选择内容文件加载。
4. Token 只保存在当前浏览器会话的 sessionStorage 里，不会上传到任何服务器；不要在公共电脑上登录后台，也不要把 token 提交进代码仓库。
5. 如果担心 token 泄露风险，可以定期在 GitHub 后台吊销并重新生成。

## 配置 Cloudinary Media Library（用于选图）

Admin 使用 Cloudinary **Media Library Widget**。点击“打开 Cloudinary 媒体库”后，用户在 Cloudinary 的登录窗口中认证、浏览或上传资源，点击“使用此图片”时会将 `{ publicId, version, format }` 复制到剪贴板。这里不使用 unsigned upload preset，也不会在前端暴露 API secret。

1. 在 Admin Pages 项目的环境变量中设置 `VITE_CLOUDINARY_CLOUD_NAME`。
2. 登录 Cloudinary 的账号必须有对应产品环境的 Media Library 访问权限；浏览器若阻止第三方 Cookie，需要允许 `cloudinary.com`。
3. Media Library Widget 是 Cloudinary Assets 计划功能，且每位访问用户需要席位许可。请先确认你的 Cloudinary 计划可使用该组件。

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

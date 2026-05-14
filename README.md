# Lopuo AI 客服系统 MVP

一个 Next.js 全栈端到端 Demo，用于在官网右下角嵌入 AI 客服助手。当前版本按“企业 customer -> 租户 tenant -> 站点/Widget site”的结构设计：企业统一管理，租户隔离知识库、会话和线索，站点只负责官网嵌入与样式配置。当前版本包含：

- 官网 Widget 与 Demo 页面
- 后台登录、总览、知识库、会话、设置
- 企业下多租户空间，支持按业务线/品牌/客户项目隔离知识库
- PostgreSQL + pgvector 数据模型
- 官网 URL 抓取、正文清洗、切块、Embedding 入库
- RAG 检索 + OpenAI-compatible 大模型问答，前期默认支持小米 `mimo-v2.5`
- Harmless 安全策略：低置信不强答、敏感商务问题转人工、客户数据隔离

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问：

- 首页：`http://localhost:3000`
- Widget Demo：`http://localhost:3000/demo`
- 后台：`http://localhost:3000/admin`

没有配置数据库时会进入本地演示模式，后台可用下面账号登录；演示模式下设置和知识库不会持久化。

```text
admin@example.com
change-me
```

入口样式可直接用 URL 预览：

```text
http://localhost:3000/demo?style=pill&text=与%20AI%20聊天
http://localhost:3000/demo?style=vertical
http://localhost:3000/demo?style=mascot
http://localhost:3000/demo?style=vertical&bottomOffset=80
```

## 数据库初始化

需要 PostgreSQL，并启用 `pgvector`。

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` 会创建一个默认客户、一个默认租户、一个默认站点和一个后台管理员。默认站点 ID 是：

```text
11111111-1111-4111-8111-111111111111
```

全新数据库中，默认租户 ID 可通过 `DEFAULT_TENANT_ID` 指定。若已有客户数据后再执行租户迁移，默认租户可能由数据库生成新 UUID，请以后后台“设置 -> 官网嵌入”展示的脚本为准。

```text
22222222-2222-4222-8222-222222222222
```

## 环境变量

关键变量见 `.env.example`：

- `DATABASE_URL`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `LLM_API_KEY`
- `LLM_API_BASE_URL`
- `LLM_MODEL`
- `EMBEDDING_API_BASE_URL`
- `EMBEDDING_API_KEY`
- `EMBEDDING_MODEL`

开发环境如果没有模型 Key，可以保留：

```text
ALLOW_FAKE_EMBEDDINGS=true
ALLOW_FAKE_LLM=true
```

这样可以先验证流程；生产环境应配置真实 Chat Provider 与 Embedding Provider。

## 嵌入官网

```html
<script
  src="https://lopuo.work/widget.js"
  data-site-id="11111111-1111-4111-8111-111111111111"
  data-tenant-id="22222222-2222-4222-8222-222222222222"
  data-launcher-position="bottom-right"
  data-launcher-horizontal-offset="20"
  data-launcher-bottom-offset="20">
</script>
```

Widget 使用 iframe 隔离样式，打开时会自动调整尺寸。`data-tenant-id` 可省略，省略时使用站点默认租户；如果同一个企业要在不同页面接入不同知识库，可以为不同入口指定不同租户 ID。`data-launcher-position` 支持 `bottom-right` / `bottom-left`，`data-launcher-horizontal-offset` 和 `data-launcher-bottom-offset` 可配置入口和桌面弹窗距离侧边、底部的像素值，默认均为 `20`。

## 代码仓库

GitHub 仓库：

```text
ssh://git@ssh.github.com:443/wudanglaodao/lopuo-chat-to-lead.git
```

本项目固定使用 `wudanglaodao` 账号对应的 SSH key。当前本机项目配置应保持为：

```bash
git remote set-url origin ssh://git@ssh.github.com:443/wudanglaodao/lopuo-chat-to-lead.git
git config core.sshCommand "ssh -i ~/.ssh/id_ed25519_wudanglaodao -o IdentitiesOnly=yes"
```

不要改回默认 `github.com` host 或默认 SSH key，否则可能会误用其他 GitHub 身份。

## 验证

```bash
npm run lint
npm test
npm run build
```

## 文档

- [PRD](./docs/ai-customer-service-prd.md)
- [Harmless 安全策略](./docs/ai-customer-service-harmless-policy.md)
- [客户独立服务计划](./docs/customer-dedicated-service-plan.md)
- [多语言内容与 AI 翻译计划](./docs/multilingual-content-plan.md)

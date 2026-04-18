# 部署到公网（Vercel + MongoDB Atlas）

本地已通过 `npm run build` 预检。按下列步骤操作即可用 HTTPS 域名访问 LMS。

## 1. 代码仓库与 Vercel

1. 在 [GitHub](https://github.com) 新建空仓库（不要勾选添加 README，避免冲突）。
2. 在本目录 `lms-project` 执行（将 `YOUR_REPO_URL` 换成你的仓库地址）：

   ```bash
   git remote add origin YOUR_REPO_URL
   git branch -M main
   git push -u origin main
   ```

3. 打开 [Vercel](https://vercel.com) → Add New Project → Import 该 Git 仓库。
4. **Root Directory**：若仓库根目录就是本 Next 项目，保持默认；若仓库上层还有文件夹，设为 `lms-project`。
5. Framework Preset：**Next.js**。Build / Output 使用默认即可（`next build`）。

## 2. Vercel 环境变量（Production）

在 Project → Settings → Environment Variables 中添加（**不要**把 `.env` 提交到 Git）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MongoDB Atlas 连接串（生产库可与开发分离） |
| `AUTH_SECRET` | 随机长字符串，例如 `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | 站点根 URL，如 `https://your-app.vercel.app` 或自定义域 |
| `AUTH_URL` | 与对外访问 URL 一致，如 `https://your-app.vercel.app`（登录回调异常时必设） |
| `AUTH_TRUST_HOST` | 设为 `true` 可让 Auth.js 信任 Vercel 主机头（与 `AUTH_URL` 二选一或同用，见 [Auth.js 文档](https://authjs.dev)） |
| `LLM_API_KEY` | 可选；Gemini / OpenAI 兼容 Key |
| `LLM_MODEL` | 可选；如 `gemini-2.0-flash` |
| `LLM_BASE_URL` | 仅 OpenAI 兼容网关需要；纯 Gemini 可不设 |
| `LLM_PROVIDER` | 同时配置了 `LLM_BASE_URL` 且仍要用 Gemini 时设为 `gemini` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 仅启用 Google 登录时需要 |

部署后若修改了变量，需在 Vercel 对该部署 **Redeploy**。

## 3. MongoDB Atlas

1. **Network Access**：添加 `0.0.0.0/0`（验证通过后建议再收紧）或 Vercel 相关 IP 策略。
2. **Database Access**：用户具备读写权限；连接串密码与 `DATABASE_URL` 一致。

## 4. Google OAuth（可选）

在 Google Cloud Console → OAuth 客户端 → 已获授权的重定向 URI 增加：

`https://你的生产域名/api/auth/callback/google`

## 5. 生产数据库结构（Prisma）

本仓库未使用 `prisma/migrations` 目录时，首次连接**生产**库可执行（**务必确认 `DATABASE_URL` 指向生产库**）：

```bash
cd lms-project
DATABASE_URL="mongodb+srv://..." npx prisma db push
```

或在本地临时导出生产连接串后运行 `npm run db:push`。避免对错误集群执行。

## 6. 密钥安全

- 曾在聊天、截图中暴露的 **Gemini / 数据库密码** 应在各控制台 **轮换** 后再写入 Vercel。
- 演示账号 Credentials（如 998/12）对外公开时有滥用风险；正式环境请评估是否保留。

## 7. 部署后验证

- 打开生产 URL → `/auth/login` → 登录 → `/dashboard`。
- 测试 Teaching Pathway、需登录的 API；查看 Vercel → Logs 是否有 Prisma / Auth / LLM 报错。

## 备选托管

也可使用 Railway、Render、Fly.io 等：构建命令 `npm run build`，启动 `npm run start`，注入与上表相同的环境变量，并配置 HTTPS 与 `NEXT_PUBLIC_APP_URL` / `AUTH_URL`。

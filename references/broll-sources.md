# 免费素材源（2026-08 实测验证 · 只收免署名源）

> **授权红线（2026-08-28 用户定版）：需要署名的 B-roll/配图源一律不接入**——
> Dareful、Wikimedia Commons 视频、Vecteezy、Openverse 等 CC BY 系全部排除。
> 唯一例外义务是 API 条款级的一行简介致谢（规则 3），那是 API 使用条款，不是素材授权署名。

## 推荐组合
- **视频 B-roll**：Pexels（主）→ Pixabay（备）→ Mixkit Free（逐条核对授权标签，见排除清单）→
  Coverr（接受其条款时；API 免费档只够开发用）→ NASA（航天/卫星/地球类）→ 无结果降级"图片 + Ken Burns"
- **配图**：Pexels photos → Pixabay images
- **logo/图标**：Iconify `logos:` 彩色 → simple-icons via jsDelivr 单色 → Wikimedia Commons（**只取 PD/CC0**，
  按 LicenseShortName 字段过滤）。单色 logo 注意底色适配：深色 logo（如 Anthropic #181818）深底模式不可直用，
  需白底卡承载或取反色变体
- **动效贴纸**：LottieFiles GraphQL（未文档化接口，做容错）
- **新闻类话题首选**：Playwright 实时截图（GitHub/官网/榜单/HN），比泛用 B-roll 更有信息量

## 领域路由（检索前先想去哪家）

| 领域 | 首选 |
|---|---|
| 人物生活 / 办公 / 城市 / 科技通用 | Pexels（现代审美强，数十万条） |
| 自然 / 延时 / 抽象与动画背景 | Pixabay（量最大 500 万+；API 支持 `lang=zh` 中文查询词） |
| 精选质感 / 竖屏 | Coverr、Mixkit Free（策展型，量小质高，均无可量产 API） |
| 航天 / 火箭 / 地球俯瞰 / 科研 | NASA（公有领域，实测 8,692 条视频，免 key API） |

## 关键请求格式
```
# Pexels 视频（Header: Authorization: <KEY>，200次/时 + 20,000次/月）
GET https://api.pexels.com/v1/videos/search?query=data%20center&orientation=portrait&size=medium&per_page=15
# 下载 video_files[].link（按档给直链 mp4，SD/HD/4K）

# Pixabay 视频（?key=<KEY>，100次/分钟，必须落盘禁热链——返回 URL 有时效）
GET https://pixabay.com/api/videos/?key=<KEY>&q=server+room&per_page=20&safesearch=true
# 四档 videos.large(4K)/medium(1080)/small/tiny；支持 &lang=zh

# Iconify 彩色 logo（免 key）
GET https://api.iconify.design/logos/openai.svg
# simple-icons 单色（注意 cdn.simpleicons.org 会被 Cloudflare 拦 curl，走 jsDelivr）
GET https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/anthropic.svg
# 注意：openai 已从 simple-icons 下架，用 Iconify logos: 集合

# LottieFiles（免认证 GraphQL，字段可能变动）
POST https://graphql.lottiefiles.com/
{"query":"{ searchPublicAnimations(query:\"confetti\", first:5) { edges { node { name jsonUrl } } } }"}

# NASA（免 key，公有领域；item 的 collection.json manifest 里有 ~orig 原始高清 mp4）
GET https://images-api.nasa.gov/search?q=satellite&media_type=video
```

## 规则
1. **搜索词一律英文**（唯一例外：Pixabay API 的 `lang=zh`）：中文口播稿分镜 → LLM 翻译成
   2-3 个英文视觉概念词（"大模型训练"→ `data center` / `GPU computing`）
2. 素材全部下载到项目 `assets/`/`public/` 本地化（确定性渲染 + Pixabay 24h 缓存条款）
3. 视频简介放一行 "Video assets from Pexels & Pixabay"（Pexels API 条款要求页面某处有致谢链接；
   这是 API 义务不是素材署名）
4. logo 只做"指代品牌"使用（新闻/评论合理使用），不暗示背书
5. Internet Archive 大陆网络不可达，不接入；Unsplash 需 production 审批 + 打点义务，不默认接入
6. 选中的每条 B-roll 在 `sources.md` 登记：检索词、源站、素材 ID/URL、授权（与调研截图记账同一张表）

## 已排除源与死站（2026-08-28 调研，防旧教程误引）
- **Videvo / Mazwai 已死**：域名 301 → Magnific（前 Freepik），免费层强制署名——不接入
- **Vecteezy 免费层**：署名 + $1,000 项目预算帽——不接入
- **Dareful**：4K 风光好但 CC BY 要署名——不接入
- **Wikimedia Commons 视频**：多数 CC BY / BY-SA 要署名（BY-SA 还传染），且只有 webm 需转码——
  B-roll 不接入；仅 logo 检索时取 PD/CC0 文件
- **Mixkit 双轨坑**：同站混放 Free License（可商用免署名，含 monetized YouTube）与
  Restricted License（仅个人非商用，明文禁 monetized YouTube/广告）——逐条核对页面授权标签，
  标 Restricted 的不下载；无 API
- **Coverr API**：免费档 50 calls/h 且限开发环境，production 档收费；条款另禁 AI 训练用途（做视频不受影响）

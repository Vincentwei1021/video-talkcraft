# 语义标注（②-1）—— 让口播稿和卡库说同一套词

2026-09-22 定版。**为什么有这一步**：在此之前，选卡漏斗只有「输入类型」一道过滤（这一镜有没有 B-roll / 图 / 人），
稿子那一侧从来没有被标注过——没人在任何一处写下「这句话在做什么」。于是：

> 「我是万里」被当成又一个论点关键词，配了全库能量最低的文字卡（soft-blur-in），
> 库里 P0 级的 `lower-third-nameplate`（人名条）就在货架上、它的「适用」行明写「也用于自我介绍」，却没人在那一刻查到它。
> 三份独立评审都判这一镜无缺陷——因为评审 rubric 只核「摆上去的东西对不对」（保真 / 蒙皮 / 版式），不核「该摆的东西在不在」。

这不是某一类语义漏了，是**需求侧没有结构化产物**。数据句配文字卡、引用句没给出处、竖屏素材裸贴、长截图静态贴屏，
都会从同一个缺口漏下去。语义标注就是补这个缺口的产物：它让 `card_match.py` 能出候选、`preflight.py` 能查覆盖、评审能对账。

## 产物：工程根 `semantics.json`

```bash
python3 <skill>/scripts/semantic_annotate.py --init      # 从 audio/timestamps.json 生成骨架（含词法提示 hint）
#   逐句填 sem / weight / entities / need
python3 <skill>/scripts/semantic_annotate.py --stats     # 校验 + 分布
```

```json
{"version": 1, "source": {"timestamps": "audio/timestamps.json", "shots": "remotion/shots.json"},
 "sentences": [
  {"i": 59, "t": 113.36, "text": "我是万里", "shot": "s11",
   "sem": ["自我介绍"], "entities": ["万里"], "need": ["身份"], "weight": "main"}
 ]}
```

| 字段 | 含义 | 词表 |
|---|---|---|
| `i` / `t` / `text` | 与 `timestamps.json` 逐句对应（脚本逐字核；改稿或重剪后标注即失效，要重新 `--init`） | — |
| `shot` | 归哪一镜（有 `shots.json` 时 `--init` 自动填） | shots.json 的 id |
| `sem` | **这句在做什么**，可多选 | 26 词封闭词表，见 `taxonomy.md`「语义索引」（源头 `scripts/cards_index.py` 的 `VOCAB`） |
| `entities` | 数字带单位 / 人名 / 品牌 / URL / 地点——③ 采素材按这个去找 | 自由文本 |
| `need` | 画面需求 | 证据 / 身份 / 量化 / 对比 / 结构 / 强调 / 无 |
| `weight` | `main` = 主句，**只有主句允许进新元素**；`sub` = 陪衬句，只允许已有元素变化 | main / sub |
| `exempt` | 豁免某条词法硬规，值是理由（≥4 字） | `{"数据": "这里的三千是比喻"}` |

`weight` 这一列同时把「禁止一句一个新元素」（cinematography §4.5）落成了机器可读的东西：
一镜至少一个 `main`（没有 = 新元素没有挂点，脚本 WARN），`sub` 句不配新卡。

## 标注纪律

1. **一张卡只列在它专门服务的语义下**，一句话也只标它真正在做的事。`论点` 是兜底档，别拿它当垃圾桶——
   库里 `论点` 只留 3 张整句卡（soft-blur-in / per-character-rise / alt-block-lines），就是这个用意。
2. **词法粗筛不是判断**。脚本的硬规只有三条（我是/我叫 X → 自我介绍；点赞/订阅/三连 → 号召；数量词 → 数据），
   拦的是系统性漏标；其余十条是 WARN 提示。真正的判断在人。
3. **标注是派生物**。`text` 与时间戳逐字一致是硬规：预剪 → 时间戳 → 标注 → 其后一切，顺序不能反。

## 下游怎么用

| 阶段 | 用法 |
|---|---|
| ③ 素材 | 素材购物清单按 `need` / `entities` 生成：`证据` 去截真页、`身份` 要头像 / 账号信息、`量化` 要图表或数据源 |
| ④ SHOTBOOK | `python3 <skill>/scripts/card_match.py --out qa/card-candidates.md` 出每镜候选（语义 × 素材 × 卡索引），每镜写一行 `- 选卡行：<语义> → <卡>、…`；选候选之外的卡，写一行 `- 语义偏离：<语义> ← 理由` |
| ④→⑤ 闸 | `preflight.py` 的「语义覆盖」段：主句里 **自我介绍 / 介绍他人 / 号召** 没有对应语义的卡 → FAIL（这三类有专设卡族、无替代物）；其余语义 → WARN；素材行声明了 V / 图 / 截图 却没有任何呈现 / 运镜类卡承接（裸贴）→ FAIL；写了「语义偏离」的放行 |
| ⑦ 审片 | 语义标注 + 候选表进评审材料（review-protocol §1.2 第五件），rubric 多两条 P1：语义事件未配卡、素材裸贴 |

没有 `semantics.json` 时 preflight 退化成对 `script.txt` 的词法兜底（我是 X / 点赞订阅 → 全片无对应语义卡 → WARN），
但逐镜覆盖核不了——**这一步别跳**。

## 库存缺口（2026-09-22 建索引时暴露）

- **设问**：只有 `title-demote-to-label`（问题降格成标签、答案在下方展开）勉强承担，没有专门的「抛出问题不立即回答」卡。
- **号召**：只有 `subscribe-cta` 一张；两张关注卡（`x-follow-card` / `douyin-follow-card`）自己的 md 明写「证明而非号召」，
  它们是 `介绍他人`。抖音关注卡还需要真实账号信息（头像 / 昵称 / 抖音号 / 粉丝数），没有就不做、写进「未完成清单」，别伪造。
- **机制**：只有 `source-converge` / `converging-arrows` 两张。

这些是真实缺口，索引里如实显示「（暂无卡）」，不硬塞——要么补卡，要么在 SHOTBOOK 写偏离理由。

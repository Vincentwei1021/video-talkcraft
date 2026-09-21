#!/usr/bin/env python3
"""关卡 1.8：工作台拆解契约 lint——本 skill 产出的工程必须能被工作台拆成多轨并逐镜调参（SKILL.md ⑤-2「拆解契约」）。
  python3 scripts/workbench_contract_lint.py <工程根 或 remotion 目录> [--allow-placeholder]

查什么（FAIL 挡交付，WARN 记录）：
  ① 六个契约文件在：shots.ts · scenes/index.ts · Subtitles.tsx · sfx.ts · timing.ts · camera.tsx（缺任一 = 工作台判"非拆解契约形态"，按钮灰）
  ② scenes/index 同名导出 SCENES 与 SCENE_PARAMS；SCENES 的镜头 id 与 shots.json 一致（--allow-placeholder 时缺镜只 WARN）；
     SCENE_PARAMS 覆盖 SCENES 的每个 id（实现了场景却没登记参数表 = 面板空）
  ③ 每个场景文件 `export const PARAMS`，且场景里调了 `useParams(`；PARAMS 条目 type 合法、有 key / default、slider 有 min/max/step、select 有 options、key 不重复；
     PARAMS 为空只 WARN（这一镜面板没东西可调，要在 SHOTBOOK 说明）
  ④ params.ts 导出 useParams / ParamsProvider / OVERRIDES；remotion/overrides.json 在盘上且是 JSON 对象（工作台写、agent 不改）
  ⑤ Subtitles.tsx 导出 phrases 与 SubtitleLine（字幕轨与字幕样式来源）
  ⑥ Environment.tsx 导出 Environment 与 Overlays，且 Main 用的是它（幕底 / 幕级覆盖轨；缺则 WARN——少两条轨但能拆）
  ⑦ shots.ts 导出 shotSequence，镜头带 lead / tail（落位同帧）
为什么要有这道闸：契约只写在 SKILL.md 里时，漏一个导出的后果（按钮灰 / 面板空）要到用户打开工作台才发现（2026-09-15 koubo-musk-chess 复盘）。
"""
import json
import os
import re
import sys

ALLOWED_TYPES = {"text", "textarea", "number", "slider", "color", "select", "boolean"}
EXTS = (".tsx", ".ts", ".jsx", ".js")

fails: list[str] = []
warns: list[str] = []


def fail(msg: str) -> None:
    fails.append(msg)
    print(f"[契约] FAIL: {msg}")


def warn(msg: str) -> None:
    warns.append(msg)
    print(f"[契约] WARN: {msg}")


def ok(msg: str) -> None:
    print(f"[契约] PASS: {msg}")


def read(p: str) -> str:
    try:
        with open(p, encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


def find_file(src: str, stem: str) -> str | None:
    for ext in EXTS:
        p = os.path.join(src, stem + ext)
        if os.path.isfile(p):
            return p
    for ext in EXTS:
        p = os.path.join(src, stem, "index" + ext)
        if os.path.isfile(p):
            return p
    return None


def exports(text: str, name: str) -> bool:
    return re.search(rf"export\s+(?:const|let|var|function|class)\s+{name}\b", text) is not None or re.search(rf"export\s*\{{[^}}]*\b{name}\b[^}}]*\}}", text) is not None


def top_level_objects(body: str) -> list[str]:
    """把 `[ {…}, {…, options: [{…}]} ]` 的数组体按括号深度切成顶层对象字串（引号内的括号不算）"""
    out: list[str] = []
    depth = 0
    start = -1
    quote: str | None = None
    i = 0
    while i < len(body):
        c = body[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "'\"`":
            quote = c
        elif c == "{":
            if depth == 0:
                start = i
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                out.append(body[start : i + 1])
                start = -1
        i += 1
    return out


def parse_map(text: str, name: str) -> dict[str, str] | None:
    """`export const NAME... = { a: X, 'b': Y }` → {a: 'X', b: 'Y'}（一行可多项）"""
    m = re.search(rf"(?:const|let|var)\s+{name}\b[^=\n]*=\s*\{{(.*?)\n\s*\}};", text, re.S)
    if not m:
        return None
    out: dict[str, str] = {}
    for e in re.finditer(r"['\"]?([\w-]+)['\"]?\s*:\s*([\w.]+)", m.group(1)):
        out[e.group(1)] = e.group(2)
    return out


def check_voice(rem: str) -> None:
    """配音文件：工程 public/ 根级须有 narration.wav（模板约定）或 full.wav——Main 的 <Audio> 与工作台多轨的配音块都按它找，缺了成片或多轨就没有人声（2026-09-21 实测）"""
    pub = os.path.join(rem, "public")
    names = [n for n in (os.listdir(pub) if os.path.isdir(pub) else []) if re.match(r"^(narration|full|voice|vo)\.(wav|mp3|m4a|aac|flac)$", n, re.I)]
    if names:
        ok(f"配音文件在 public/ 根：{' '.join(names)}")
    else:
        fail("public/ 根没有 narration.wav / full.wav——Main 的 <Audio> 与工作台多轨的配音块都按这个名字找，缺了成片或多轨就没有人声")


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    allow_placeholder = "--allow-placeholder" in sys.argv
    root = os.path.abspath(args[0]) if args else os.getcwd()
    rem = root if os.path.isdir(os.path.join(root, "src")) and not os.path.isdir(os.path.join(root, "remotion")) else os.path.join(root, "remotion")
    src = os.path.join(rem, "src")
    if not os.path.isdir(src):
        fail(f"找不到 {src}（给工程根或 remotion 目录）")
        return 1
    print(f"== 工作台拆解契约 lint · {rem} ==")

    # ① 契约文件
    found: dict[str, str | None] = {}
    for stem in ["shots", "scenes/index", "Subtitles", "sfx", "timing", "camera", "params", "Environment", "Main"]:
        found[stem] = find_file(src, stem)
    missing = [s for s in ["shots", "scenes/index", "Subtitles", "sfx", "timing", "camera"] if not found[s]]
    if missing:
        fail(f"契约文件缺：{', '.join(missing)}（工作台 gen-index 会判「非拆解契约形态」，拆解按钮灰）")
    else:
        ok("六个契约文件在（shots / scenes/index / Subtitles / sfx / timing / camera）")
    check_voice(rem)

    # shots.json ids
    shot_ids: list[str] = []
    sj = os.path.join(rem, "shots.json")
    if os.path.isfile(sj):
        try:
            data = json.loads(read(sj))
            items = data if isinstance(data, list) else data.get("shots", [])
            shot_ids = [str(s["id"]) for s in items if isinstance(s, dict) and "id" in s]
        except (json.JSONDecodeError, AttributeError):
            warn("shots.json 解析失败，跳过镜头 id 对账")
    else:
        warn("没有 remotion/shots.json，跳过镜头 id 对账")

    # ② scenes/index
    scenes: dict[str, str] | None = None
    params_map: dict[str, str] | None = None
    idx = found["scenes/index"]
    if idx:
        t = read(idx)
        scenes = parse_map(t, "SCENES")
        params_map = parse_map(t, "SCENE_PARAMS")
        if scenes is None or not exports(t, "SCENES"):
            fail("scenes/index 没有 `export const SCENES = {…}`")
        if params_map is None or not exports(t, "SCENE_PARAMS"):
            fail("scenes/index 没有 `export const SCENE_PARAMS = {…}`（每镜参数表的登记处；没有它逐镜卡面板为空）")
        if scenes is not None and shot_ids:
            miss = [i for i in shot_ids if i not in scenes]
            extra = [i for i in scenes if i not in shot_ids]
            if miss:
                (warn if allow_placeholder else fail)(f"shots.json 里的镜头在 SCENES 表缺席：{', '.join(miss)}" + ("（占位阶段允许）" if allow_placeholder else "（全部镜头实现后才能过闸；⑤-1 阶段加 --allow-placeholder）"))
            if extra:
                warn(f"SCENES 表里有 shots.json 没有的 id：{', '.join(extra)}")
            if not miss and not extra:
                ok(f"SCENES 表与 shots.json 镜头 id 一致（{len(shot_ids)} 镜）")
        if scenes is not None and params_map is not None:
            np_ = [i for i in scenes if i not in params_map]
            if np_:
                fail(f"SCENE_PARAMS 没登记这些已实现镜头：{', '.join(np_)}")
            else:
                ok(f"SCENE_PARAMS 覆盖 SCENES 全部 {len(scenes)} 镜")

        # ③ 每个场景文件
        if scenes:
            imports = dict(re.findall(r"import\s*\{([^}]*)\}\s*from\s*['\"](\.[^'\"]+)['\"]", t))
            # 组件名 → 文件
            comp_file: dict[str, str] = {}
            for names, rel in imports.items():
                for n in re.split(r"\s*,\s*", names.strip()):
                    n = n.split(" as ")[0].strip()
                    if n:
                        comp_file[n] = rel
            checked = 0
            for sid, comp in scenes.items():
                rel = comp_file.get(comp)
                if not rel:
                    warn(f"{sid}：在 scenes/index 里找不到 {comp} 的 import，跳过该场景文件检查")
                    continue
                sf = find_file(os.path.dirname(idx), rel[2:] if rel.startswith("./") else rel)
                if not sf:
                    fail(f"{sid}：场景文件 {rel} 不存在")
                    continue
                st = read(sf)
                checked += 1
                if not exports(st, "PARAMS"):
                    fail(f"{sid}（{os.path.basename(sf)}）：没有 `export const PARAMS`——这一镜在工作台面板没东西可调")
                    continue
                if "useParams(" not in st:
                    fail(f"{sid}（{os.path.basename(sf)}）：导出了 PARAMS 但没调 useParams——面板改了不生效")
                m = re.search(r"export\s+const\s+PARAMS\s*=\s*\[(.*?)\]\s*as\s+const", st, re.S)
                body = m.group(1) if m else ""
                entries = top_level_objects(body)   # 一条一对象（select 的 options 里有嵌套 {value,label}，按括号深度切）
                if not body.strip():
                    warn(f"{sid}：PARAMS 为空（面板没东西可调，SHOTBOOK 蒙皮行要说明为什么）")
                keys: list[str] = []
                for e in entries:
                    tm = re.search(r"type\s*:\s*['\"](\w+)['\"]", e)
                    km = re.search(r"key\s*:\s*['\"]([\w-]+)['\"]", e)
                    if not tm or not km:
                        continue
                    typ, key = tm.group(1), km.group(1)
                    keys.append(key)
                    if typ not in ALLOWED_TYPES:
                        fail(f"{sid}：参数 {key} 的 type '{typ}' 不在工作台控件集 {sorted(ALLOWED_TYPES)}")
                    if not re.search(r"\bdefault\s*:", e):
                        fail(f"{sid}：参数 {key} 没有 default")
                    if typ == "slider" and not all(re.search(rf"\b{k}\s*:", e) for k in ("min", "max", "step")):
                        fail(f"{sid}：slider {key} 缺 min / max / step")
                    if typ == "select" and not re.search(r"\boptions\s*:", e):
                        fail(f"{sid}：select {key} 缺 options")
                dup = sorted({k for k in keys if keys.count(k) > 1})
                if dup:
                    fail(f"{sid}：PARAMS key 重复：{', '.join(dup)}")
                if m and not entries:
                    warn(f"{sid}：PARAMS 条目未能解析（写法不是 {{type: '…', key: '…', …}} 一条一对象？工作台会丢弃不合规条目）")
            if checked and not fails:
                ok(f"{checked} 个场景文件都导出 PARAMS 并调用 useParams，条目形态合规")

    # ④ params.ts + overrides.json
    pf = found["params"]
    if not pf:
        fail("没有 params.ts（useParams / ParamsProvider / OVERRIDES）——照 template/motion-systems/params.ts 抄")
    else:
        pt = read(pf)
        miss = [n for n in ("useParams", "ParamsProvider", "OVERRIDES") if not exports(pt, n)]
        if miss:
            fail(f"params.ts 缺导出：{', '.join(miss)}")
        else:
            ok("params.ts 导出 useParams / ParamsProvider / OVERRIDES")
    ov = os.path.join(rem, "overrides.json")
    if not os.path.isfile(ov):
        fail("没有 remotion/overrides.json（建成 `{}`；工作台写、agent 不改）")
    else:
        try:
            data = json.loads(read(ov) or "{}")
            if not isinstance(data, dict):
                fail("overrides.json 不是 JSON 对象")
            else:
                n = sum(len(v) for v in data.values() if isinstance(v, dict))
                ok(f"overrides.json 在盘上（{len(data)} 镜 / {n} 个覆盖键{'——用户在工作台调过参，交付以它为准' if n else ''}）")
        except json.JSONDecodeError:
            fail("overrides.json 不是合法 JSON")

    # ⑤ Subtitles
    sub = found["Subtitles"]
    if sub:
        st = read(sub)
        miss = [n for n in ("Subtitles", "phrases", "SubtitleLine") if not exports(st, n)]
        if miss:
            fail(f"Subtitles.tsx 缺导出：{', '.join(miss)}（字幕轨吃 phrases()，字幕句片段用 SubtitleLine 画）")
        else:
            ok("Subtitles.tsx 导出 Subtitles / phrases / SubtitleLine")

    # ⑥ Environment
    env = found["Environment"]
    if not env:
        warn("没有 Environment.tsx（幕底 / 幕级覆盖两条轨不会出现；幕底若画在 Main 里，拆解后镜头轨下面是空的）")
    else:
        et = read(env)
        miss = [n for n in ("Environment", "Overlays") if not exports(et, n)]
        if miss:
            warn(f"Environment.tsx 缺导出：{', '.join(miss)}")
        else:
            ok("Environment.tsx 导出 Environment / Overlays")
        mt = read(found["Main"] or "")
        if mt and "Environment" not in mt:
            warn("Main.tsx 没有用 Environment（幕底在 Main 里另画了一份？成片与拆解会不一致）")

    # ⑦ shots.ts
    sh = found["shots"]
    if sh:
        stt = read(sh)
        if not exports(stt, "shotSequence"):
            warn("shots.ts 没导出 shotSequence（工作台按 round(start·fps) − lead 落位；确认与 Main 的 Sequence 同规则）")
        if "lead" not in stt or "tail" not in stt:
            warn("shots.ts 的镜头没有 lead / tail 字段（交叠转场的帧数；没有则拆解按 0 处理）")

    print()
    if fails:
        print(f"== 契约 FAIL ==  FAIL {len(fails)} · WARN {len(warns)}  → 工作台拆不开或面板缺项，先修再交付")
        return 1
    print(f"== 契约 PASS ==  FAIL 0 · WARN {len(warns)}  → 工作台可拆多轨、逐镜可调参")
    return 0


if __name__ == "__main__":
    sys.exit(main())

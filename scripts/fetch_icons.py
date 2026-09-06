#!/usr/bin/env python3
"""fetch_icons.py —— 从 Iconify 抓 lucide 线稿图标，生成 G5 线稿示意图系统用的 icons.ts（每个图标 = 24×24 viewBox 的一组 path d）。

用法：
  python3 scripts/fetch_icons.py file-text,laptop,gauge [--set lucide] [--out <icons.ts 路径>] [--merge]
  --out 缺省 = 库内 template/motion-systems/icons.ts（相对本脚本定位，任何 cwd 都可跑）；进片工程传 --out remotion/src/<schematic.tsx 所在目录>/icons.ts
  --merge：与已有 icons.ts 合并（保留旧图标，追加 / 覆盖新抓的）；输出按名字排序、文件头固定，因此重跑是幂等的
授权：lucide = ISC（免署名可商用）；tabler = MIT。其他集合先查 https://api.iconify.design/collections?prefixes=<set> 的 license 再用。
把来源与授权写进工程 sources.md（broll-sources.md 规则 6 同样适用于图标）。

为什么转成 path d：DrawIcon 用 pathLength=1 + dashoffset 逐段描画，circle / rect / line / polyline 都要先变成 path 才能"一笔画"。
"""
import json, re, subprocess, sys, os

DEFAULT_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'template', 'motion-systems', 'icons.ts')

def fetch(icon_set: str, names: list[str]) -> dict:
    url = f"https://api.iconify.design/{icon_set}.json?icons=" + ",".join(names)
    # urllib 的默认 UA 会被 Iconify 403，走 curl 并带 UA
    out = subprocess.run(["curl", "-s", "-m", "40", "-A", "Mozilla/5.0 video-talkcraft fetch_icons", url], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if data.get("not_found"):
        print("未找到：", data["not_found"], file=sys.stderr)
    # 别名（aliases）解析到父图标
    for alias, spec in (data.get("aliases") or {}).items():
        parent = spec.get("parent")
        if parent in data["icons"] and alias not in data["icons"]:
            data["icons"][alias] = data["icons"][parent]
    return data

def to_paths(body: str) -> list[str]:
    """把 <path|circle|rect|line|polyline|polygon|ellipse> 统一转成 path d（圆 / 椭圆用两段 arc，圆角矩形用 arc 角）。"""
    out = []
    for m in re.finditer(r'<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)/?>', body):
        tag, attrs = m.group(1), dict(re.findall(r'([a-zA-Z-]+)="([^"]*)"', m.group(2)))
        f = lambda k, dflt='0': float(attrs.get(k, dflt))
        if tag == 'path':
            out.append(attrs['d'])
        elif tag == 'circle':
            cx, cy, r = f('cx'), f('cy'), f('r'); out.append(f'M {cx-r} {cy} a {r} {r} 0 1 0 {2*r} 0 a {r} {r} 0 1 0 {-2*r} 0')
        elif tag == 'ellipse':
            cx, cy, rx, ry = f('cx'), f('cy'), f('rx'), f('ry'); out.append(f'M {cx-rx} {cy} a {rx} {ry} 0 1 0 {2*rx} 0 a {rx} {ry} 0 1 0 {-2*rx} 0')
        elif tag == 'rect':
            x, y, w, h = f('x'), f('y'), f('width'), f('height'); r = f('rx', '0')
            if r:
                out.append(f'M {x+r} {y} h {w-2*r} a {r} {r} 0 0 1 {r} {r} v {h-2*r} a {r} {r} 0 0 1 {-r} {r} h {-(w-2*r)} a {r} {r} 0 0 1 {-r} {-r} v {-(h-2*r)} a {r} {r} 0 0 1 {r} {-r} z')
            else:
                out.append(f'M {x} {y} h {w} v {h} h {-w} z')
        elif tag == 'line':
            out.append(f"M {f('x1')} {f('y1')} L {f('x2')} {f('y2')}")
        elif tag in ('polyline', 'polygon'):
            pts = attrs['points'].replace(',', ' ').split()
            s = 'M ' + ' L '.join(f'{pts[i]} {pts[i+1]}' for i in range(0, len(pts), 2)); out.append(s + (' z' if tag == 'polygon' else ''))
    return out

def parse_existing(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    src = open(path, encoding='utf-8').read()
    m = re.search(r'ICONS: Record<string, string\[\]> = \{(.*)\};', src, re.S)
    if not m:
        return {}
    icons = {}
    for k, v in re.findall(r'\n\s*"([^"]+)": (\[[^\n]*\]),', m.group(1)):
        icons[k] = json.loads(v)
    return icons

def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('--'):
        sys.exit(__doc__)
    names = [x for x in args[0].split(',') if x]
    icon_set = args[args.index('--set') + 1] if '--set' in args else 'lucide'
    out_path = args[args.index('--out') + 1] if '--out' in args else DEFAULT_OUT
    merge = '--merge' in args
    data = fetch(icon_set, names)
    icons = parse_existing(out_path) if merge else {}
    for k, v in data['icons'].items():
        icons[k] = to_paths(v['body'])
    lines = [f'// 自动生成（scripts/fetch_icons.py 抓取 Iconify {icon_set}，{"ISC" if icon_set == "lucide" else "见 collections 的 license"} 免署名）：',
             '// 每个图标 = 24×24 viewBox 的一组 path d，供 schematic.tsx DrawIcon 逐段描画。增删请重跑脚本，不要手改。',
             'export const ICONS: Record<string, string[]> = {']
    for k in sorted(icons):
        lines.append(f'  {json.dumps(k)}: {json.dumps(icons[k], ensure_ascii=False)},')
    lines.append('};')
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    open(out_path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(f'{len(icons)} 个图标 → {out_path}')

if __name__ == '__main__':
    main()

"""空台预检（渲染前静态分析，advisory）：从节拍表推算每个镜头里的"无事件长窗"。

为什么存在：freezedetect 抓静帧要等 13 分钟全片渲染之后；而"哪个镜头会空台"从
beats.json + shots.json 就能算出来——镜头内相邻事件间隔 >gap 秒、且窗内没有持续运动的，
就是静帧闸的候选病灶（2026-09-01 竖屏版 s14/s26 两处返修均属此类，各多付一轮全渲）。

处方（写进镜头代码，不是免检借口）：
  - 长窗补 idle 层：道具胶带定位框/候场名牌虚框等"在戏里"的呼吸层；
  - 呼吸层必须带位移（±5px 浮动/底色脉动）——纯透明度呼吸过不了 freezedetect
    （2026-09-01 实测：透明度呼吸 FAIL，加位移后 PASS）；
  - 或该镜本身有持续运动（orbit/巡航/打字机），在 --ok 里声明镜号即跳过。

用法：
  python3 scripts/beat_gap_check.py remotion/beats.json remotion/shots.json [--gap 2.0] [--ok s13,s22]
advisory：只 WARN 不挡关（有些镜头的持续运动本脚本看不见）；每条 WARN 都要在 SHOTBOOK
里答得出"这窗里什么在动"。
"""
import argparse
import json
import sys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("beats")
    ap.add_argument("shots")
    ap.add_argument("--gap", type=float, default=2.0)
    ap.add_argument("--ok", default="", help="声明有持续运动、可跳过的镜号（逗号分隔）")
    a = ap.parse_args()

    beats = json.load(open(a.beats))
    shots = json.load(open(a.shots))
    ok = set(x.strip() for x in a.ok.split(",") if x.strip())

    warns = 0
    for s in shots:
        if s["id"] in ok:
            continue
        events = sorted([s["start"]] + [b["t"] for b in beats if s["start"] <= b["t"] < s["end"]] + [s["end"]])
        for t0, t1 in zip(events, events[1:]):
            if t1 - t0 > a.gap:
                warns += 1
                print(f"WARN {s['id']}  {t0:7.2f}s → {t1:7.2f}s  ({t1 - t0:.1f}s 无事件)"
                      f"  —— 需 idle 层（带位移的呼吸层）或声明持续运动")
    print(f"{'PASS: 无' if warns == 0 else f'共 {warns} 个'}超过 {a.gap}s 的无事件窗"
          + ("" if warns == 0 else "（advisory：逐条补 idle 层或用 --ok 声明后复跑）"))
    return 0


if __name__ == "__main__":
    sys.exit(main())

import type { ProjectData } from "./types";
import { uid } from "./types";

/** 初始演示工程：主轨四张卡顺排 + 上层透明文字轨。
 *  同时是 Remotion Studio「Main」合成的 defaultProps 来源——保持纯函数，别引 store。 */
export const demoProject = (): ProjectData => ({
  name: "未命名工程",
  fps: 30,
  width: 960,
  height: 540,
  tracks: [
    {
      id: uid("track"),
      name: "文字层",
      clips: [
        {
          id: uid("clip"),
          cardId: "text-basic",
          start: 333,
          duration: 60,
          inOffset: 0,
          speed: 1,
          opacity: 1,
          scale: 1,
          x: 0,
          y: -170,
          props: {
            content: "关键结论",
            transparentBg: true,
            fontSize: 44,
            color: "#e8720c",
            anim: "slam",
            delay: 0.5,
          },
        },
      ],
    },
    {
      id: uid("track"),
      name: "主轨",
      clips: [
        { id: uid("clip"), cardId: "impact-open-title", start: 0, duration: 97, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
        { id: uid("clip"), cardId: "chapter-title-card", start: 105, duration: 100, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
        { id: uid("clip"), cardId: "count-badge-title", start: 213, duration: 112, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
        { id: uid("clip"), cardId: "highlighter-sweep", start: 333, duration: 60, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
      ],
    },
  ],
});

import React from "react";
import { Composition } from "remotion";
import { CARD_LIST } from "../cards/registry";
import { defaultsOf } from "../cards/types";
import { zodFromCard } from "./zodFromCard";
import { MainComposition } from "../preview/Composition";
import { demoProject } from "../demoProject";
import { projectDuration, projectEndFrame } from "../types";
import type { ProjectData } from "../types";

/** Remotion Studio 入口：
 *  - Main：整条时间轴合成（吃工作台导出的工程 JSON——右侧 Props 面板可直接贴 JSON）
 *  - 每张已参数化卡各注册一个合成，Zod schema 由工作台 schema 自动转换，
 *    Studio Inspector 自动生成调参表单。 */
export const RemotionRoot: React.FC = () => {
  const demo = demoProject();
  return (
    <>
      <Composition
        id="Main"
        component={MainComposition as React.ComponentType<{ project: ProjectData; renderExact?: boolean }>}
        durationInFrames={projectDuration(demo)}
        fps={demo.fps}
        width={demo.width}
        height={demo.height}
        defaultProps={{ project: demo, renderExact: false }}
        calculateMetadata={({ props }) => ({
          // 导出成片（renderExact）用内容精确时长；Studio 预览留 1s 余量
          durationInFrames: props.renderExact
            ? Math.max(2, projectEndFrame(props.project))
            : projectDuration(props.project),
          fps: props.project.fps,
          width: props.project.width,
          height: props.project.height,
        })}
      />
      {CARD_LIST.map((card) => (
        <Composition
          key={card.id}
          id={card.id}
          // 动态注册：schema/defaultProps 无法静态对齐类型，交给运行时（zod 会校验）
          component={card.component as React.ComponentType<Record<string, unknown>>}
          durationInFrames={card.durationInFrames}
          fps={30}
          width={960}
          height={540}
          schema={zodFromCard(card) as never}
          defaultProps={defaultsOf(card) as never}
        />
      ))}
    </>
  );
};

import React from 'react';
import {AbsoluteFill, Composition, useCurrentFrame} from 'remotion';
import gsap from 'gsap';
import {animate} from 'animejs';

// 冒烟合成：check-runtime.sh 升级依赖后渲 1 帧，证明 remotion + react + gsap + animejs 在新版本下能打包、能出图。
// 内容无所谓，出得来 PNG 就是 PASS；出不来就回滚 package.json / lock。
const Smoke: React.FC = () => {
  const f = useCurrentFrame();
  const eased = gsap.parseEase('power2.out')(Math.min(1, f / 10));
  void animate;
  return (
    <AbsoluteFill style={{background: '#111', color: '#fff', fontFamily: 'sans-serif', fontSize: 40, alignItems: 'center', justifyContent: 'center'}}>
      talkcraft runtime smoke · frame {f} · ease {eased.toFixed(2)}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Smoke" component={Smoke} durationInFrames={10} fps={30} width={640} height={360} />;

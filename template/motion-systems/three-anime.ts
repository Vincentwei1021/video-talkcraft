import {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import type {Timeline} from 'animejs';
// Registers the anime.js v4 Three.js adapter: Object3D / Material / Color
// targets become animatable with flat props (x, y, z, rotateX/Y/Z in degrees,
// scale, opacity, color...).
import 'animejs/adapters/three';
import './anime-remotion'; // engine main loop must be disabled before timelines exist
import {useCamera} from './camera';
import type {CamState} from './camera';

export type ThreeCtx = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

/**
 * Owns a WebGL canvas whose Three.js scene is animated by an anime.js
 * timeline, deterministically seeked to the current Remotion frame and
 * re-rendered synchronously before the frame is captured.
 *
 * `onCamera` runs after the seek with the shared CameraRig state, so the 3D
 * camera can ride the same continuous curve as the DOM (one camera, two
 * projections). `leadFrames` matches the shot's transition overlap.
 */
export const useThreeAnime = (
  width: number,
  height: number,
  setup: (ctx: ThreeCtx) => Timeline,
  opts?: {
    leadFrames?: number;
    onCamera?: (cam: CamState, ctx: ThreeCtx) => void;
  },
) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<(ThreeCtx & {tl: Timeline}) | null>(null);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cam = useCamera();
  const leadFrames = opts?.leadFrames ?? 0;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    const tl = setup({scene, camera, renderer});
    tl.pause();
    ctxRef.current = {scene, camera, renderer, tl};
    return () => {
      tl.revert();
      renderer.dispose();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const c = ctxRef.current;
    if (!c) return;
    c.tl.seek(Math.max(0, ((frame - leadFrames) / fps) * 1000));
    opts?.onCamera?.(cam, c);
    c.renderer.render(c.scene, c.camera);
  });

  return canvasRef;
};

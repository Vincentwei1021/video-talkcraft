/** @deprecated 单轨"成片（实时）"工程（一条轨一个 kb-main clip）2026-09-21 下线：用户定版"制作中的看板与交付面都是多轨，单轨的 deprecate 就好"。
 *  不再有 `?live` 单轨 / `?mono` / 「▶ 实时看板」按钮 / 素材库里的整条成片卡（`buildLiveProject` 已删）；
 *  只留这个 clip id，给 kouboImport 的同步排除与 pipeline/store 的 syncLiveClip 兜住浏览器里可能还存着的旧存档（仍可开、可渲）。 */
export const LIVE_CLIP_ID = "kb-live-main";

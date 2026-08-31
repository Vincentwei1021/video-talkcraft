import React from "react";
import { CARD_LIST } from "../cards/registry";
import { findClip, useStore } from "../store";

/** 素材库：点击卡片加入时间轴（选中 clip 所在轨；否则最下层主轨），落点在播放头 */
export const LibraryPanel: React.FC = () => {
  const addClip = useStore((s) => s.addClip);

  const add = (cardId: string) => {
    const s = useStore.getState();
    const hit = s.selectedClipId ? findClip(s.project, s.selectedClipId) : null;
    addClip(cardId, hit?.track.id, s.playhead);
  };

  const categories = [...new Set(CARD_LIST.map((c) => c.category))];

  return (
    <div className="library">
      <div className="panel-title">动效卡</div>
      <div className="library-list">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="lib-cat">{cat}</div>
            {CARD_LIST.filter((c) => c.category === cat).map((card) => (
              <button key={card.id} className="lib-card" onClick={() => add(card.id)}>
                <span className="lib-dot" style={{ background: card.accent ?? "#666" }} />
                <span className="lib-name">{card.name}</span>
                <span className="lib-dur">{(card.durationInFrames / 30).toFixed(1)}s</span>
                <span className="lib-add">＋</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="lib-foot dim">
        已参数化 {CARD_LIST.length} / 78 张卡
        <br />
        其余卡按同一 schema 模式渐进接入
      </div>
    </div>
  );
};

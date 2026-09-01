import React, { useEffect, useRef, useState } from "react";
import type { CardDef } from "../cards/types";
import { CARD_LIST } from "../cards/registry";
import { cardPreviewUrl, cardThumbUrl } from "../cards/templateCards";
import { TPL_CATEGORIES, TPL_META } from "../cards/tplMeta";
import { useStore } from "../store";
import { buildKouboProject, SFX_FILES } from "../kouboImport";
import { MEDIA_ITEMS, SFX_ALL } from "../mediaManifest";
import { setDragPayload } from "../dnd";

const TABS = [
  { id: "media", label: "素材" },
  { id: "cards", label: "动效库" },
  { id: "sfx", label: "音效" },
  { id: "ambient", label: "环境光效" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** 素材 tab 归属的分类（整片 + 拆解单元）；音频/素材文件卡不直接列出 */
const MEDIA_CARD_CATS = new Set(["成片", "口播拆解"]);
const NON_MOTION_CATS = new Set([
  ...MEDIA_CARD_CATS,
  "音频",
  "素材",
  "环境光效",
  "口播镜头", // 成片镜头场景卡：只在时间轨上编辑，不进库
]);

/** 动效卡的画廊分类（参数化版也按画廊归类；工作台原生卡归"工作台"） */
const galleryCatOf = (id: string) => TPL_META[id]?.category ?? "工作台";
const galleryOrder = new Map(Object.keys(TPL_META).map((id, i) => [id, i]));

/** 进入视口才加载并循环播放的预览视频 */
const LazyLoopVideo: React.FC<{ src: string; poster?: string }> = ({ src, poster }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setVisible(en.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (visible) setLoaded(true);
  }, [visible]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !loaded) return;
    if (visible) el.play().catch(() => {});
    else el.pause();
  }, [visible, loaded]);
  return (
    <video
      ref={ref}
      className="lib-thumb"
      src={loaded ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
    />
  );
};

const sfxShort = (f: string) => f.replace(/^pk-/, "").replace(/\.mp3$/, "");

export const LibraryPanel: React.FC = () => {
  const setProject = useStore((s) => s.setProject);
  const setPreview = useStore((s) => s.setPreview);
  const [tab, setTab] = useState<TabId>("media");
  // 动效库分类默认折叠，点击标题展开
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const toggleCat = (cat: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  /** 动效卡网格单元：点击=中屏预览，拖拽=上轨 */
  const CardCell: React.FC<{ card: CardDef }> = ({ card }) => {
    const preview = cardPreviewUrl(card.id);
    return (
      <div
        className="lib-cell"
        draggable
        onDragStart={(e) => setDragPayload(e, { cardId: card.id, label: card.name })}
        onClick={() => setPreview({ kind: "card", cardId: card.id })}
        title={`${card.name} · 点击预览，拖到时间轨添加`}
      >
        {preview ? (
          <LazyLoopVideo src={preview} poster={cardThumbUrl(card.id) ?? undefined} />
        ) : (
          <div className="lib-thumb lib-thumb-empty" style={{ color: card.accent }}>
            {card.name.slice(0, 4)}
          </div>
        )}
        <div className="lib-cell-name">{card.name}</div>
        <div className="lib-cell-meta dim">
          {(card.durationInFrames / 30).toFixed(1)}s{card.schema.length > 0 ? " · 可调参" : ""}
        </div>
      </div>
    );
  };

  /** 列表行（拆解单元 / 音效 / 素材文件通用外壳） */
  const Row: React.FC<{
    dot: string;
    name: string;
    meta?: string;
    onClick: () => void;
    payload: Parameters<typeof setDragPayload>[1];
    thumb?: React.ReactNode;
  }> = ({ dot, name, meta, onClick, payload, thumb }) => (
    <div
      className="lib-card"
      draggable
      onDragStart={(e) => setDragPayload(e, payload)}
      onClick={onClick}
      title={`${name} · 点击预览，拖到时间轨添加`}
    >
      {thumb ?? <span className="lib-dot" style={{ background: dot }} />}
      <span className="lib-name">{name}</span>
      {meta && <span className="lib-dur">{meta}</span>}
    </div>
  );

  const motionCards = CARD_LIST.filter((c) => !NON_MOTION_CATS.has(c.category));
  const kouboCards = CARD_LIST.filter((c) => MEDIA_CARD_CATS.has(c.category));
  const sfxUse = new Map(SFX_FILES.map((s) => [s.file, s.count]));

  // 动效库按画廊分类分组（组内保持画廊原始顺序）
  const motionGroups = [...TPL_CATEGORIES, "工作台"]
    .map((cat) => ({
      cat,
      cards: motionCards
        .filter((c) => galleryCatOf(c.id) === cat)
        .sort((a, b) => (galleryOrder.get(a.id) ?? 999) - (galleryOrder.get(b.id) ?? 999)),
    }))
    .filter((g) => g.cards.length > 0);

  return (
    <div className="library">
      <div className="lib-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`lib-tab${tab === t.id ? " on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="library-list">
        {tab === "media" && (
          <>
            <button
              className="btn"
              style={{ width: "100%", marginBottom: 8 }}
              title="把口播成片拆解为逐句字幕/转场/环境/数字人/23 镜头/配音/逐条音效的多轨工程（可撤销）"
              onClick={() => setProject(buildKouboProject())}
            >
              ⇣ 拆解导入：口播成片
            </button>

            <div className="lib-cat">素材文件</div>
            {MEDIA_ITEMS.map((m) => (
              <Row
                key={m.file}
                dot="#30d158"
                name={m.label}
                meta={m.kind === "video" ? "视频" : m.kind === "image" ? "图片" : "音频"}
                onClick={() => setPreview({ kind: m.kind, file: m.file, label: m.label })}
                payload={
                  m.kind === "video"
                    ? { cardId: "video-clip", props: { file: m.file }, label: m.label, duration: 150 }
                    : m.kind === "image"
                      ? { cardId: "image-clip", props: { file: m.file }, label: m.label, duration: 90 }
                      : { cardId: "audio-clip", props: { file: m.file, volume: 1 }, label: m.label, duration: 300 }
                }
                thumb={
                  m.kind === "video" ? (
                    <video className="lib-thumb-s" src={`/${m.file}`} preload="metadata" muted />
                  ) : m.kind === "image" ? (
                    <img className="lib-thumb-s" src={`/${m.file}`} />
                  ) : undefined
                }
              />
            ))}

            <div className="lib-cat">口播成片 · 拆解单元</div>
            {kouboCards.map((card) => (
              <Row
                key={card.id}
                dot={card.accent ?? "#666"}
                name={card.name}
                meta={`${(card.durationInFrames / 30).toFixed(1)}s`}
                onClick={() => setPreview({ kind: "card", cardId: card.id })}
                payload={{ cardId: card.id, label: card.name }}
              />
            ))}
          </>
        )}

        {tab === "cards" &&
          motionGroups.map((g) => {
            const open = openCats.has(g.cat);
            return (
              <div key={g.cat}>
                <button className="lib-cat-toggle" onClick={() => toggleCat(g.cat)}>
                  <span className={`caret${open ? " open" : ""}`}>▸</span>
                  {g.cat}
                  <span className="dim" style={{ marginLeft: "auto" }}>
                    {g.cards.length}
                  </span>
                </button>
                {open && (
                  <div className="lib-grid">
                    {g.cards.map((card) => (
                      <CardCell key={card.id} card={card} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {tab === "ambient" &&
          CARD_LIST.filter((c) => c.category === "环境光效").map((card) => (
            <Row
              key={card.id}
              dot={card.accent ?? "#666"}
              name={card.name}
              meta={`${(card.durationInFrames / 30).toFixed(1)}s${card.schema.length > 0 ? " · 可调参" : ""}`}
              onClick={() => setPreview({ kind: "card", cardId: card.id })}
              payload={{ cardId: card.id, label: card.name }}
            />
          ))}

        {tab === "sfx" &&
          SFX_ALL.map((f) => (
            <Row
              key={f}
              dot="#ff9f0a"
              name={sfxShort(f)}
              meta={sfxUse.has(f) ? `片中×${sfxUse.get(f)}` : "未用"}
              onClick={() => setPreview({ kind: "audio", file: `sfx/${f}`, label: sfxShort(f) })}
              payload={{
                cardId: "audio-clip",
                props: { file: `sfx/${f}`, volume: 0.35 },
                label: sfxShort(f),
              }}
            />
          ))}
      </div>

      <div className="lib-foot dim">
        动效 {motionCards.length} 卡（{motionCards.filter((c) => c.schema.length > 0).length} 张可调参）
        · 音效 {SFX_ALL.length}
        <br />
        点击预览 · 拖拽到时间轨添加
      </div>
    </div>
  );
};

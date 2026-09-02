import React, { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import type { CardDef } from "../cards/types";
import { defaultsOf } from "../cards/types";
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
  { id: "bg", label: "背景" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** 素材 tab 归属的分类（整片 + 拆解单元）；音频/素材文件卡不直接列出 */
const MEDIA_CARD_CATS = new Set(["成片", "口播拆解"]);
const NON_MOTION_CATS = new Set([
  ...MEDIA_CARD_CATS,
  "音频",
  "素材",
  "背景",
  "口播镜头", // 成片镜头场景卡：只在时间轨上编辑，不进库
]);

/** 动效卡的画廊分类（参数化版也按画廊归类；工作台原生卡归"工作台"） */
const galleryCatOf = (id: string) => TPL_META[id]?.category ?? "工作台";
const galleryOrder = new Map(Object.keys(TPL_META).map((id, i) => [id, i]));

/** 进入视口才挂载重内容（预览视频 / 实时 Player） */
const useVisible = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setVisible(en.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

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

/** 没有预渲染视频的卡（拆解单元等）：可见时用实时 Player 循环当缩略图 */
const LazyCardLoop: React.FC<{ card: CardDef }> = ({ card }) => {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} className="lib-thumb" style={{ position: "relative" }}>
      {visible && (
        <Player
          component={card.component}
          inputProps={defaultsOf(card)}
          durationInFrames={Math.max(2, card.durationInFrames)}
          compositionWidth={960}
          compositionHeight={540}
          fps={30}
          autoPlay
          loop
          controls={false}
          initiallyMuted
          numberOfSharedAudioTags={0}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          acknowledgeRemotionLicense
        />
      )}
    </div>
  );
};

/** 静态背景卡：组件本身就是纯 CSS 静态底，按 960×540 画布等比缩放渲染
 *  （直接塞小容器会让格距/光斑比例失真） */
const StaticCardThumb: React.FC<{ card: CardDef }> = ({ card }) => {
  const Comp = card.component;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 960));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="lib-thumb" style={{ position: "relative", overflow: "hidden" }}>
      {scale > 0 && (
        <div
          style={{
            position: "absolute",
            width: 960,
            height: 540,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Comp {...defaultsOf(card)} />
        </div>
      )}
    </div>
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

  /** 网格单元通用外壳：点击=中屏预览，拖拽=上轨 */
  const Cell: React.FC<{
    name: string;
    meta?: string;
    onClick: () => void;
    payload: Parameters<typeof setDragPayload>[1];
    children: React.ReactNode;
  }> = ({ name, meta, onClick, payload, children }) => (
    <div
      className="lib-cell"
      draggable
      onDragStart={(e) => setDragPayload(e, payload)}
      onClick={onClick}
      title={`${name} · 点击预览，拖到时间轨添加`}
    >
      {children}
      <div className="lib-cell-name">{name}</div>
      {meta && <div className="lib-cell-meta dim">{meta}</div>}
    </div>
  );

  /** 动效卡网格单元 */
  const CardCell: React.FC<{ card: CardDef }> = ({ card }) => {
    const preview = cardPreviewUrl(card.id);
    return (
      <Cell
        name={card.name}
        meta={`${(card.durationInFrames / 30).toFixed(1)}s${card.schema.length > 0 ? " · 可调参" : ""}`}
        onClick={() => setPreview({ kind: "card", cardId: card.id })}
        payload={{ cardId: card.id, label: card.name }}
      >
        {preview ? (
          <LazyLoopVideo src={preview} poster={cardThumbUrl(card.id) ?? undefined} />
        ) : (
          <LazyCardLoop card={card} />
        )}
      </Cell>
    );
  };

  /** 音效等无画面素材的列表行 */
  const Row: React.FC<{
    dot: string;
    name: string;
    meta?: string;
    onClick: () => void;
    payload: Parameters<typeof setDragPayload>[1];
  }> = ({ dot, name, meta, onClick, payload }) => (
    <div
      className="lib-card"
      draggable
      onDragStart={(e) => setDragPayload(e, payload)}
      onClick={onClick}
      title={`${name} · 点击预览，拖到时间轨添加`}
    >
      <span className="lib-dot" style={{ background: dot }} />
      <span className="lib-name">{name}</span>
      {meta && <span className="lib-dur">{meta}</span>}
    </div>
  );

  const motionCards = CARD_LIST.filter((c) => !NON_MOTION_CATS.has(c.category));
  const kouboCards = CARD_LIST.filter((c) => MEDIA_CARD_CATS.has(c.category));
  const bgCards = CARD_LIST.filter((c) => c.category === "背景");
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
              className="btn wide"
              title="把口播成片拆解为逐句字幕/转场/环境/数字人/23 镜头/配音/逐条音效的多轨工程（可撤销）"
              onClick={() => setProject(buildKouboProject())}
            >
              ⇣ 拆解导入：口播成片
            </button>

            <div className="lib-cat">素材文件</div>
            <div className="lib-grid">
              {MEDIA_ITEMS.map((m) => (
                <Cell
                  key={m.file}
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
                >
                  {m.kind === "video" ? (
                    <LazyLoopVideo src={`/${m.file}`} />
                  ) : m.kind === "image" ? (
                    <img className="lib-thumb" src={`/${m.file}`} />
                  ) : (
                    <div className="lib-thumb lib-thumb-empty">🔊</div>
                  )}
                </Cell>
              ))}
            </div>

            <div className="lib-cat">口播成片 · 拆解单元</div>
            <div className="lib-grid">
              {kouboCards.map((card) => (
                <Cell
                  key={card.id}
                  name={card.name}
                  meta={`${(card.durationInFrames / 30).toFixed(1)}s`}
                  onClick={() => setPreview({ kind: "card", cardId: card.id })}
                  payload={{ cardId: card.id, label: card.name }}
                >
                  <LazyCardLoop card={card} />
                </Cell>
              ))}
            </div>
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

        {tab === "bg" && (
          <>
            <div className="lib-cat">预设背景（design-language 定版）</div>
            <div className="lib-grid">
              {bgCards.map((card) => (
                <Cell
                  key={card.id}
                  name={card.name}
                  meta="静态底 · 可调参"
                  onClick={() => setPreview({ kind: "card", cardId: card.id })}
                  payload={{ cardId: card.id, label: card.name }}
                >
                  <StaticCardThumb card={card} />
                </Cell>
              ))}
            </div>
          </>
        )}

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
        · 音效 {SFX_ALL.length} · 背景 {bgCards.length}
        <br />
        点击预览 · 拖拽到时间轨添加
      </div>
    </div>
  );
};

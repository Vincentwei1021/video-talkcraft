export type KbModule = { id: string; real: boolean; file: string };
export type KbsrcMap = {
  linked: boolean;
  realSrc: string | null;
  srcDir: string;
  stubDir: string;
  remotionDir: string | null;
  projectRoot: string | null;
  modules: KbModule[];
  realIds: string[];
  viteAlias: { find: string; replacement: string }[];
  webpackAlias: Record<string, string>;
};
export declare const kbsrcMap: (root: string) => KbsrcMap;

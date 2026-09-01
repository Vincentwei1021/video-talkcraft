/** 外部口播工程源码（workbench/kbsrc 符号链接，Vite 别名 @kbsrc）。
 *  这里声明为 any 模块：外部工程不参与本工程的 tsc 严格检查。 */
declare module "@kbsrc/*";

/** 模板卡正主源码（workbench/tplcards → template/cards，别名 @tpl）。
 *  同样不参与本工程 tsc 严格检查——模板源码以 template/cards 为准，不为 lint 改动。 */
declare module "@tpl/*";

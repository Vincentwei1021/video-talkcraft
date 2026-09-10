export declare const resolveRoot: (arg?: string) => string;
export declare const readManual: (root: string) => { stage: string | null; verdicts: Record<string, string>; issues: unknown[]; notes: unknown[] };
export declare const derivePipeline: (root: string, manual?: ReturnType<typeof readManual>) => Record<string, unknown>;
export declare const writePipeline: (root: string, state: unknown) => void;
export declare const shotbookExcerpt: (root: string, id: string, maxChars?: number) => string;

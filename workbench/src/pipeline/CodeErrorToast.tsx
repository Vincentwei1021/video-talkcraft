import React from "react";
import { usePipeline } from "./store";

/** 工程代码报错（Vite 转换失败：语法错 / 引用缺失）时右下角提示，不盖整页；HMR 成功后自动消失 */
export const CodeErrorToast: React.FC = () => {
  const err = usePipeline((s) => s.codeError);
  const clear = usePipeline((s) => s.setCodeError);
  if (!err) return null;
  return (
    <div className="code-toast" role="status">
      <div className="code-toast-title">
        工程代码有错（agent 可能正在改，画面停在上一版）
        <button className="mini" onClick={() => clear(null)} title="关闭">
          ✕
        </button>
      </div>
      {err.file && <div className="mono dim">{err.file}</div>}
      <div className="code-toast-msg">{err.message}</div>
    </div>
  );
};

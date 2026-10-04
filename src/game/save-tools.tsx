import { useState, useSyncExternalStore } from "react";
import { downloadSave, getSaveMessage, subscribeSave } from "./storage";
export function SaveNotice() {
  const message = useSyncExternalStore(subscribeSave, getSaveMessage, () => "");
  return message ? <div role="alert" className="fixed left-3 right-3 top-3 z-50 rounded border bg-neutral-900 p-3 text-sm text-white">{message}</div> : null;
}
export function SaveTools<T>({ value, parse, restore, filename }: { value: T; parse: (text: string) => T; restore: (value: T) => boolean; filename: string }) {
  const [message, setMessage] = useState("");
  return <div className="my-3 space-y-2 text-sm">
    <button type="button" className="min-h-11 rounded border px-4" onClick={() => downloadSave(value, filename)}>匯出存檔</button>
    <label className="block">匯入存檔
      <input aria-label="匯入存檔" className="block max-w-full py-2" type="file" accept="application/json,.json" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          if (file.size > 1024 * 1024) throw new Error("存檔過大");
          const next = parse(await file.text());
          if (window.confirm("以這份備份取代目前進度？")) setMessage(restore(next) ? "存檔已匯入。" : "匯入無法儲存，原進度保留。");
        } catch { setMessage("存檔格式無效或版本不相容，原進度保留。"); }
        e.target.value = "";
      }} />
    </label>
    <p role="status">{message}</p>
  </div>;
}

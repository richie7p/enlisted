/** Local saves are user-controlled; validation protects reliability, not anti-cheat. */
let message = "";
const listeners = new Set<() => void>();
export function getSaveMessage() { return message; }
export function subscribeSave(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function reportSaveMessage(next: string) { message = next; listeners.forEach((fn) => fn()); }
export function readStored<T>(key: string, backup: string, parse: (text: string) => T): T | null {
  for (const candidate of [key, backup]) {
    try {
      const text = localStorage.getItem(candidate);
      if (!text) continue;
      const result = parse(text);
      if (candidate === backup) reportSaveMessage("主存檔損毀，已載入備份。請匯出保留副本。");
      return result;
    } catch { /* Try the independently stored backup, including invalid JSON shapes. */ }
  }
  return null;
}
export function writeStored<T>(key: string, backup: string, value: T, parse: (text: string) => T): boolean {
  try {
    const previous = localStorage.getItem(key);
    if (previous) {
      // A save written by a newer client must not be silently downgraded.
      try {
        const old = JSON.parse(previous);
        const next = value as { version?: number };
        if (typeof old?.version === "number" && typeof next?.version === "number" && old.version > next.version) {
          reportSaveMessage("存檔來自較新版本，已保留原檔。請更新遊戲後再儲存。");
          return false;
        }
      } catch { /* Invalid JSON is handled by the validation below. */ }
      try { parse(previous); localStorage.setItem(backup, previous); }
      catch { /* An invalid or quota-blocked backup must not prevent a primary write. */ }
    }
    localStorage.setItem(key, JSON.stringify(value));
    reportSaveMessage("");
    return true;
  } catch {
    reportSaveMessage("無法儲存進度（儲存空間不足或瀏覽器限制）。請先匯出備份，離開頁面會失去未儲存進度。");
    return false;
  }
}
export function downloadSave(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

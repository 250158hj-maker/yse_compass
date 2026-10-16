// デモ用の状態をブラウザ(localStorage)に置くための薄い包み。
// プライベートウィンドウ・サイトデータのブロックなどで読み書きが例外になっても、既定値で動き続けるようにする。

export function readStorage<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても画面はメモリ上の状態で動く。
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 同上。
  }
}

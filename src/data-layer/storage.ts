/**
 * Helper localStorage dengan self-healing saat quota exceeded
 * (paritas dengan pola loadFromStorage/saveToStorage aplikasi lama).
 */

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : defaultValue;
  } catch (error) {
    console.error('Error loading from storage', error);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('quota') || errorStr.includes('exceeded') || errorStr.includes('limit')) {
      console.warn(`Storage quota exceeded for key: ${key}. Attempting self-healing/truncation.`);
      try {
        if (Array.isArray(value)) {
          const trimmed = value.slice(0, 50);
          localStorage.setItem(key, JSON.stringify(trimmed));
          return;
        }
        const nonEssentialKeys = ['jeje_cached_activityLogs', 'jeje_cached_logs', 'jeje_cached_history'];
        nonEssentialKeys.forEach((k) => {
          if (k !== key) localStorage.removeItem(k);
        });
        localStorage.setItem(key, JSON.stringify(value));
      } catch (innerError) {
        console.warn('Failed to resolve storage quota limit after self-healing. Silently ignoring.', innerError);
      }
    } else {
      console.error('Error saving to storage', error);
    }
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* diabaikan */
  }
}

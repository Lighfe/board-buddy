/**
 * Per-board background colour.
 *
 * The backend board record has no colour field yet, so the choice is stored in
 * the browser: it applies on this device only. Swap the read/write helpers for
 * API calls once the contract gains a `color` field.
 */

export interface BoardColor {
  id: string;
  label: string;
  /** CSS colour used as the board background, or null for the app default. */
  value: string | null;
}

export const BOARD_COLORS: BoardColor[] = [
  { id: "default", label: "Default", value: null },
  { id: "slate", label: "Slate", value: "oklch(0.94 0.01 250)" },
  { id: "sky", label: "Sky", value: "oklch(0.94 0.04 230)" },
  { id: "mint", label: "Mint", value: "oklch(0.94 0.05 160)" },
  { id: "sand", label: "Sand", value: "oklch(0.95 0.04 85)" },
  { id: "blush", label: "Blush", value: "oklch(0.94 0.04 20)" },
  { id: "lilac", label: "Lilac", value: "oklch(0.94 0.04 300)" },
];

const KEY = (boardId: string) => `tack:board-color:${boardId}`;

export function getBoardColorId(boardId: string): string {
  if (typeof window === "undefined") return "default";
  try {
    return window.localStorage.getItem(KEY(boardId)) ?? "default";
  } catch {
    return "default";
  }
}

export function setBoardColorId(boardId: string, colorId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (colorId === "default") window.localStorage.removeItem(KEY(boardId));
    else window.localStorage.setItem(KEY(boardId), colorId);
  } catch {
    /* storage unavailable (private mode): colour just stays default */
  }
  window.dispatchEvent(new CustomEvent("tack:board-color", { detail: { boardId } }));
}

export function colorValue(colorId: string): string | null {
  return BOARD_COLORS.find((c) => c.id === colorId)?.value ?? null;
}

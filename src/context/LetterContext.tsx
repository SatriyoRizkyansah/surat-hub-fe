import { createContext, useState, useCallback, type ReactNode } from "react";
import type { LetterContext as LetterCtxType, UnitInfo, LetterMeta, CampusAddress } from "../types/letter";
import { DEFAULT_UNIT_INFO, DEFAULT_LETTER_META, DEFAULT_ADDRESSES } from "../templates/letterhead";

export interface LetterContextValue {
  /** Current letter context (unit + meta + addresses) */
  letterCtx: LetterCtxType;
  /** Replace unit info (e.g. when user switches unit/faculty) */
  setUnit: (unit: UnitInfo) => void;
  /** Partially update letter meta (e.g. set nomor surat from backend) */
  setMeta: (partial: Partial<LetterMeta>) => void;
  /** Replace addresses list */
  setAddresses: (addresses: CampusAddress[]) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const LetterCtx = createContext<LetterContextValue | null>(null);

export function LetterProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<UnitInfo>(DEFAULT_UNIT_INFO);
  const [meta, setMetaState] = useState<LetterMeta>(DEFAULT_LETTER_META);
  const [addresses, setAddresses] = useState<CampusAddress[]>(DEFAULT_ADDRESSES);

  const setMeta = useCallback((partial: Partial<LetterMeta>) => setMetaState((prev) => ({ ...prev, ...partial })), []);

  const letterCtx: LetterCtxType = { unit, meta, addresses };

  return <LetterCtx.Provider value={{ letterCtx, setUnit, setMeta, setAddresses }}>{children}</LetterCtx.Provider>;
}

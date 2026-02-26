import { useContext } from "react";
import { LetterCtx, type LetterContextValue } from "./LetterContext";

export function useLetterContext(): LetterContextValue {
  const ctx = useContext(LetterCtx);
  if (!ctx) {
    throw new Error("useLetterContext must be used within <LetterProvider>");
  }
  return ctx;
}

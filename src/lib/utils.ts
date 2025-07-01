// // File: src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppIdFromHeaders(req: Request): string | null {
  return req.headers.get("Adorable-App-Id");
}

export function normalizeMessageContent(content: any): string {
  if (typeof content === "string") return content;
  if (content?.text) return content.text;
  if (content?.content) return content.content;
  return "";
}

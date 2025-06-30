// // src/lib/freestyle.ts
import { FreestyleSandboxes } from "freestyle-sandboxes";

export const freestyle = new FreestyleSandboxes({
  apiKey: process.env.FREESTYLE_API_KEY!,
  baseUrl: process.env.FREESTYLE_API_URL ?? "https://api.freestyle.sh",
  headers: {
    "Freestyle-Firecracker-Dev-Servers":
      process.env.FREESTYLE_FIRECRACKER === "true" ? "true" : "false",
    "Freestyle-Firecracker-Build-Servers":
      process.env.FREESTYLE_FIRECRACKER === "true" ? "true" : "false",
    Authorization: `Bearer ${process.env.FREESTYLE_API_KEY}`,
  },
});

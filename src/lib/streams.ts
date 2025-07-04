// // File: src/lib/streams.ts
declare global {
  // eslint-disable-next-line no-var
  var streams: Record<string, { readable: ReadableStream; prompt?: string }>;
}

globalThis.streams = globalThis.streams || {};

export async function getStream(appId: string) {
  return globalThis.streams[appId]?.readable ?? null;
}

export async function setStream(
  appId: string,
  readable: ReadableStream,
  prompt?: string
) {
  globalThis.streams[appId] = { readable, prompt };
}

export async function deleteStream(appId: string) {
  delete globalThis.streams[appId];
}

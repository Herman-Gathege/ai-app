"use client";

import WebView from "./webview";

export default function Preview(props: {
  repo: string;
  baseId: string;
  activeView: string;
  appId: string;
  domain?: string;
}) {
  return (
    <div className="h-full overflow-hidden relative">
      <WebView
        repo={props.repo}
        baseId={props.baseId}
        appId={props.appId}
        domain={props.domain}
      />
    </div>
  );
}

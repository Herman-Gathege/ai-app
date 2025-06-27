// src/components/app-wrapper.tsx
"use client";

import React, { useEffect, useState } from "react";
import Chat from "./chat";
import Preview from "./preview";
import { Message } from "ai";
import { createContext } from "react";
import { useContext } from "react";
import { TopBar } from "./topbar";
import { MessageCircle, Monitor } from "lucide-react";

export const RepoContext = createContext<string | undefined>(undefined);

export function useCurrentRepo() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error("useCurrentRepo must be used within a RepoProvider");
  }
  return context;
}

export default function AppWrapper({
  appName,
  repo,
  initialMessages,
  appId,
  repoId,
  baseId,
  codeServerUrl,
  domain,
}: {
  appName: string;
  repo: string;
  appId: string;
  respond?: boolean;
  initialMessages: Message[];
  repoId: string;
  baseId: string;
  codeServerUrl: string;
  domain?: string;
}) {
  const [activeView, setActiveView] = useState<"web" | "files">("web");
  const [mobileActiveTab, setMobileActiveTab] = useState<"chat" | "preview">("chat");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto"; // or 'visible'
    };
  }, []);

  return (
    <RepoContext.Provider value={repoId}>
      <div className="h-screen flex flex-col" style={{ height: '100dvh' }}>
        {/* Desktop and Mobile container */}
        <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_2fr]">
          {/* Chat component - positioned for both mobile and desktop */}
          <div 
            className={
              isMobile 
                ? `absolute inset-0 z-10 flex flex-col transition-transform duration-200 ${
                    mobileActiveTab === "chat" ? "translate-x-0" : "-translate-x-full"
                  }`
                : "h-full overflow-hidden flex flex-col"
            }
            style={isMobile ? { top: 'env(safe-area-inset-top)', bottom: 'calc(60px + env(safe-area-inset-bottom))' } : undefined}
          >
            <Chat
              topBar={<TopBar appName={appName} codeServerUrl={codeServerUrl} />}
              appId={appId}
              initialMessages={initialMessages}
            />
          </div>

          {/* Preview component - positioned for both mobile and desktop */}
          <div 
            className={
              isMobile 
                ? `absolute inset-0 z-10 transition-transform duration-200 ${
                    mobileActiveTab === "preview" ? "translate-x-0" : "translate-x-full"
                  }`
                : "overflow-auto"
            }
            style={isMobile ? { top: 'env(safe-area-inset-top)', bottom: 'calc(60px + env(safe-area-inset-bottom))' } : undefined}
          >
            <Preview
              activeView={activeView}
              repo={repo}
              baseId={baseId}
              appId={appId}
              domain={domain}
            />
          </div>
        </div>

        {/* Mobile tab navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 flex border-t bg-background/95 backdrop-blur-sm pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button
              onClick={() => setMobileActiveTab("chat")}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                mobileActiveTab === "chat"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className={`h-6 w-6 mb-1 ${mobileActiveTab === "chat" ? "fill-current" : ""}`} />
              <span className="text-xs font-medium">Chat</span>
            </button>
            <button
              onClick={() => setMobileActiveTab("preview")}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                mobileActiveTab === "preview"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className={`h-6 w-6 mb-1 ${mobileActiveTab === "preview" ? "fill-current" : ""}`} />
              <span className="text-xs font-medium">Preview</span>
            </button>
          </div>
        )}
      </div>
    </RepoContext.Provider>
  );
}

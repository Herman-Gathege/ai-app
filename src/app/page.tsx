// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import { FrameworkSelector } from "@/components/framework-selector";
import Image from "next/image";
import LogoSvg from "@/logo.svg";
import { useEffect, useState as useReactState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExampleButton } from "@/components/ExampleButton";
// import { unstable_ViewTransition as ViewTransition } from "react";
import { UserButton } from "@stackframe/stack";
import { UserApps } from "@/components/user-apps";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CreditTracker from "@/components/CreditTracker";

const queryClient = new QueryClient();

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("next");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useReactState(false);
  const router = useRouter();

  // For the typing animation
  const placeholderRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderText, setPlaceholderText] = useState("");
  const fullPlaceholder = "I want to build";
  const exampleIdeas = [
    "a dog food marketplace",
    "a personal portfolio website for my mother's bakery",
    "a B2B SaaS for burrito shops to sell burritos",
    "a social network for coders to find grass to touch",
    "a potato farm.🇮🇪 🇮🇪 🇮🇪            ",
  ];
  

  // Ensure hydration is complete before starting typing animation
  useEffect(() => {
    setIsMounted(true);
  });

  // Typing animation effect
  useEffect(() => {
    if (!isMounted) return;

    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let typingTimer: NodeJS.Timeout;
    let pauseTimer: NodeJS.Timeout;

    const typeNextCharacter = () => {
      {
        // Start typing the current example idea
        const currentIdea = exampleIdeas[currentTextIndex];
        if (currentCharIndex < currentIdea.length) {
          setPlaceholderText(
            fullPlaceholder +
              " " +
              currentIdea.substring(0, currentCharIndex + 1)
          );
          currentCharIndex++;
          typingTimer = setTimeout(typeNextCharacter, 100);
        } else {
          // Pause at the end of typing the example
          pauseTimer = setTimeout(() => {
            // Begin erasing the example
            eraseText();
          }, 2000);
        }
      }
    };

    const eraseText = () => {
      const currentIdea = exampleIdeas[currentTextIndex];
      if (currentCharIndex > 0) {
        setPlaceholderText(
          fullPlaceholder + " " + currentIdea.substring(0, currentCharIndex - 1)
        );
        currentCharIndex--;
        typingTimer = setTimeout(eraseText, 50);
      } else {
        // Move to the next example
        currentTextIndex = (currentTextIndex + 1) % exampleIdeas.length;
        pauseTimer = setTimeout(() => {
          typingTimer = setTimeout(typeNextCharacter, 100);
        }, 500);
      }
    };

    // Start the typing animation
    typingTimer = setTimeout(typeNextCharacter, 500);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(pauseTimer);
    };
  }, [isMounted]);

  const handleSubmit = async () => {
    setIsLoading(true);
    console.log("🔍 Prompt being submitted:", prompt);

    router.push(
      // changed the line from `/app/new?message=${prompt}` to
      // `/app/new?unsentMessage=${encodeURIComponent(prompt)}`
      // to ensure the prompt is properly encoded for the URL

      `/app/new?unsentMessage=${encodeURIComponent(prompt)}&baseId=${
        {
          next: "nextjs-dkjfgdf",
          vite: "vite-skdjfls",
          expo: "expo-lksadfp",
        }[framework]
      }`
    );
  };

  return (
  <QueryClientProvider client={queryClient}>
    <main className="min-h-screen p-4 relative">
      <div className="flex w-full justify-between items-center">
        <h1 className="text-lg font-bold flex-1 sm:w-80">
          <a href="https://www.freestyle.sh">freestyle.sh</a>
        </h1>
        <Image
          className="dark:invert mx-2"
          src={LogoSvg}
          alt="Adorable Logo"
          width={36}
          height={36}
        />
        <div className="flex items-center gap-2 flex-1 sm:w-80 justify-end ">
          <UserButton />
          <CreditTracker />
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/pricing")}
            className="text-xs"
          >
            Upgrade
          </Button>
        </div>
      </div>

      <div className="grid">
        <div className="w-full -mx-1 flex flex-col items-end col-start-1 col-end-1 row-start-1 row-end-1 opacity-20 select-none">
          {/* placeholder for background */}
        </div>
        <div className="w-full max-w-lg px-4 sm:px-0 mx-auto flex flex-col items-center mt-16 sm:mt-24 md:mt-32 col-start-1 col-end-1 row-start-1 row-end-1 z-10">
          <p className="text-neutral-600 text-center mb-6 text-3xl sm:text-4xl md:text-5xl font-bold">
            Let AI Cook
          </p>

          <div className="w-full relative my-5">
            <div className="relative w-full max-w-full overflow-hidden">
              <div className="w-full bg-accent rounded-md relative z-10 border transition-colors">
                <PromptInput
                  leftSlot={
                    <FrameworkSelector
                      value={framework}
                      onChange={setFramework}
                    />
                  }
                  isLoading={isLoading}
                  value={prompt}
                  onValueChange={setPrompt}
                  onSubmit={handleSubmit}
                  className="relative z-10 border-none bg-transparent shadow-none focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all duration-200 ease-in-out "
                >
                  <PromptInputTextarea
                    ref={placeholderRef}
                    placeholder={placeholderText ?? fullPlaceholder}
                    className="min-h-[100px] w-full bg-transparent dark:bg-transparent backdrop-blur-sm pr-12"
                    onBlur={() => {}}
                  />
                  <PromptInputActions>
                    <Button
                      variant={"ghost"}
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isLoading || !prompt.trim()}
                      className="h-7 text-xs"
                    >
                      <span className="hidden sm:inline">Start Creating ⏎</span>
                      <span className="sm:hidden">Create ⏎</span>
                    </Button>
                  </PromptInputActions>
                </PromptInput>
              </div>
            </div>
          </div>

          <Examples setPrompt={setPrompt} />

          <div className="mt-8 mb-16">
            <a
              href="https://freestyle.sh"
              className="border rounded-md px-4 py-2 mt-4 text-sm font-semibold transition-colors duration-200 ease-in-out cursor-pointer w-full max-w-72 text-center block"
            >
              <span className="block font-bold">
                By <span className="underline">freestyle.sh</span>
              </span>
              <span className="text-xs">
                JavaScript infrastructure for AI.
              </span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t py-8 mx-0 sm:-mx-4">
        <UserApps />
      </div>
    </main>
  </QueryClientProvider>
);

}

function Examples({ setPrompt }: { setPrompt: (text: string) => void }) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap justify-center gap-2 px-2">
        <ExampleButton
          text="Dog Food Marketplace"
          promptText="Build a dog food marketplace where users can browse and purchase premium dog food."
          onClick={(text) => {
            console.log("Example clicked:", text);
            setPrompt(text);
          }}
        />
        <ExampleButton
          text="Personal Website"
          promptText="Create a personal website with portfolio, blog, and contact sections."
          onClick={(text) => {
            console.log("Example clicked:", text);
            setPrompt(text);
          }}
        />
        <ExampleButton
          text="Burrito B2B SaaS"
          promptText="Build a B2B SaaS for burrito shops to manage inventory, orders, and delivery logistics."
          onClick={(text) => {
            console.log("Example clicked:", text);
            setPrompt(text);
          }}
        />
      </div>
    </div>
  );
}

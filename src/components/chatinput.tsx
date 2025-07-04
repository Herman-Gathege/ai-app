"use client";

import {
  PromptInput,
  // PromptInputAction,
  // PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { useState, useEffect } from "react";

interface PromptInputBasicProps {
  onSubmit?: (e?: React.FormEvent<HTMLFormElement> | any) => void;
  isGenerating?: boolean;
  input?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

export function PromptInputBasic({
  onSubmit: handleSubmit,
  isGenerating = false,
  input = "",
  onValueChange,
  disabled,
}: PromptInputBasicProps) {
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(isGenerating);
  }, [isGenerating]);

  return (
    <div className="relative w-full">
      <PromptInput
        value={input}
        onValueChange={(value) => onValueChange?.(value)}
        isLoading={isLoading}
        onSubmit={() => handleSubmit?.()}
        className="w-full border dark:bg-accent shadow-sm rounded-lg border-gray-300focus-within:border-gray-400 focus-within:ring-1 transition-all duration-200 ease-in-out focus-within:ring-gray-200 border-gray-300"
      >
        <PromptInputTextarea
          placeholder={
            isGenerating
              ? "Adorable is working..."
              : "Type your message here..."
          }
          className="pr-10 bg-transparent dark:bg-transparent"
          disabled={isGenerating || disabled}
        />
      </PromptInput>
      <div className="absolute right-3 bottom-3">
        <Button
          variant={"default"}
          size="icon"
          className="h-8 w-8 rounded-full"
          disabled={isGenerating || disabled}
          onClick={() => handleSubmit?.()}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

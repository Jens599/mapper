"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleTheme() {
    setTheme(dark ? "light" : "dark");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={`Use ${dark ? "light" : "dark"} theme`}
          disabled={!mounted}
        >
          {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? "Light theme" : "Dark theme"}</TooltipContent>
    </Tooltip>
  );
}

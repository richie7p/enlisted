import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/game/ui/App";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    setLive(true);
  }, []);
  if (!live) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0c0e0b] text-[#c4b59a]">
        <p style={{ letterSpacing: "0.28em", fontSize: 13 }}>ENLISTED</p>
      </div>
    );
  }
  return <GameApp />;
}
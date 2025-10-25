import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MinecraftCardProps {
  children: ReactNode;
  className?: string;
  glowType?: "online" | "offline" | "none";
}

export default function MinecraftCard({ children, className, glowType = "none" }: MinecraftCardProps) {
  return (
    <div className={cn(
      "server-card rounded-xl p-6 minecraft-border hover-glow",
      glowType === "online" && "status-online",
      glowType === "offline" && "status-offline",
      className
    )}>
      {children}
    </div>
  );
}

import { Server, Terminal, Folder, Cpu, Network, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import SystemStats from "@/components/system-stats";

type TabType = "terminal" | "files" | "processes" | "network" | "editor";

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: "terminal" as TabType, label: "Terminal", icon: Terminal },
    { id: "files" as TabType, label: "File Manager", icon: Folder },
    { id: "processes" as TabType, label: "Processes", icon: Cpu },
    { id: "network" as TabType, label: "Network", icon: Network },
    { id: "editor" as TabType, label: "Text Editor", icon: Edit },
  ];

  return (
    <div className="w-64 terminal-panel border-r terminal-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b terminal-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Server className="h-4 w-4 text-black" />
          </div>
          <div>
            <h1 className="font-semibold text-sm terminal-text">VPS Simulator</h1>
            <p className="text-xs terminal-muted">ubuntu-server-01</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                      : "terminal-text hover:bg-gray-600/50"
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Stats */}
      <SystemStats />
    </div>
  );
}

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Terminal from "@/components/terminal";
import FileManager from "@/components/file-manager";
import ProcessManager from "@/components/process-manager";
import NetworkMonitor from "@/components/network-monitor";
import TextEditor from "@/components/text-editor";
import { Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type TabType = "terminal" | "files" | "processes" | "network" | "editor";

export default function VPSSimulator() {
  const [activeTab, setActiveTab] = useState<TabType>("terminal");
  const [currentPath, setCurrentPath] = useState("/home/root");

  const renderTabContent = () => {
    switch (activeTab) {
      case "terminal":
        return <Terminal currentPath={currentPath} onPathChange={setCurrentPath} />;
      case "files":
        return <FileManager currentPath={currentPath} onPathChange={setCurrentPath} />;
      case "processes":
        return <ProcessManager />;
      case "network":
        return <NetworkMonitor />;
      case "editor":
        return <TextEditor />;
      default:
        return <Terminal currentPath={currentPath} onPathChange={setCurrentPath} />;
    }
  };

  return (
    <div className="flex h-screen terminal-bg terminal-text font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="h-12 terminal-panel border-b terminal-border flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-sm font-mono terminal-muted">root@ubuntu-server-01</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-1.5 terminal-muted hover:terminal-text">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1.5 terminal-muted hover:terminal-text">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

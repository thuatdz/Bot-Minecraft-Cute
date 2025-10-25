import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CommandHistory } from "@shared/schema";

interface TerminalProps {
  currentPath: string;
  onPathChange: (path: string) => void;
}

export default function Terminal({ currentPath, onPathChange }: TerminalProps) {
  const [command, setCommand] = useState("");
  const [commandOutput, setCommandOutput] = useState<CommandHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Get command history
  const { data: history = [] } = useQuery<CommandHistory[]>({
    queryKey: ["/api/commands/history"],
  });

  // Execute command mutation
  const executeCommand = useMutation({
    mutationFn: async (cmd: string) => {
      const response = await apiRequest("POST", "/api/commands", { command: cmd });
      return response.json();
    },
    onSuccess: (data) => {
      setCommandOutput(prev => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ["/api/commands/history"] });
      
      // Handle special commands that change state
      if (data.command.startsWith("cd ")) {
        const newPath = data.command.split(" ")[1];
        if (newPath && data.success) {
          onPathChange(newPath.startsWith("/") ? newPath : `${currentPath}/${newPath}`);
        }
      } else if (data.command === "clear") {
        setCommandOutput([]);
      }
    },
  });

  // Clear history mutation
  const clearHistory = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/commands/history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands/history"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      executeCommand.mutate(command.trim());
      setCommand("");
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand("");
      }
    }
  };

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commandOutput]);

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const formatOutput = (output: string) => {
    if (output.includes('\x1b[2J\x1b[H')) {
      // Clear screen command
      return '';
    }
    
    // Handle ANSI color codes (basic implementation)
    return output
      .replace(/\x1b\[34m([^\x1b]*)\x1b\[0m/g, '<span class="terminal-info">$1</span>')
      .replace(/\x1b\[31m([^\x1b]*)\x1b\[0m/g, '<span class="terminal-error">$1</span>')
      .replace(/\x1b\[32m([^\x1b]*)\x1b\[0m/g, '<span class="terminal-success">$1</span>')
      .replace(/\x1b\[33m([^\x1b]*)\x1b\[0m/g, '<span class="terminal-warning">$1</span>');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Terminal Output */}
      <div 
        ref={outputRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm custom-scrollbar"
      >
        {/* Welcome message */}
        <div className="space-y-1 mb-4 terminal-muted">
          <div>Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-150-generic x86_64)</div>
          <div>Last login: {new Date().toLocaleString()}</div>
          <div className="mt-3 terminal-text">Type 'help' for available commands.</div>
        </div>

        {/* Command output */}
        <div className="space-y-1">
          {commandOutput.map((entry, index) => (
            <div key={index} className="space-y-1">
              <div className="flex">
                <span className="terminal-prompt">root@ubuntu-server-01:{currentPath}$</span>
                <span className="terminal-text ml-2">{entry.command}</span>
              </div>
              {entry.output && (
                <div 
                  className={`ml-4 whitespace-pre-line ${entry.success ? 'terminal-text' : 'terminal-error'}`}
                  dangerouslySetInnerHTML={{ __html: formatOutput(entry.output) }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current prompt */}
        <form onSubmit={handleSubmit} className="flex items-center mt-2">
          <span className="terminal-prompt">root@ubuntu-server-01:{currentPath}$</span>
          <Input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 ml-2 bg-transparent border-none outline-none text-white font-mono placeholder-gray-500 focus:ring-0 focus:border-none p-0"
            placeholder="Enter command..."
            disabled={executeCommand.isPending}
          />
        </form>
      </div>

      {/* Command History Panel */}
      <div className="h-32 terminal-panel border-t terminal-border p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold terminal-muted uppercase tracking-wide">
            Command History
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearHistory.mutate()}
            className="text-xs terminal-accent hover:terminal-info h-auto p-1"
          >
            Clear
          </Button>
        </div>
        <div className="text-xs font-mono space-y-1 terminal-muted custom-scrollbar overflow-y-auto max-h-20">
          {history.slice(-10).map((entry, index) => (
            <div key={index}>{entry.command}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

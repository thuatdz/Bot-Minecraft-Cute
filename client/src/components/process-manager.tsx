import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Process } from "@shared/schema";

export default function ProcessManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get processes
  const { data: processes = [], isLoading, refetch } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
    refetchInterval: false, // Tắt auto-refresh để tránh spam
  });

  // Kill process mutation
  const killProcess = useMutation({
    mutationFn: async (pid: number) => {
      await apiRequest("DELETE", `/api/processes/${pid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({
        title: "Success",
        description: "Process terminated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to terminate process",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "bg-green-500/20 text-green-400";
      case "sleeping":
        return "bg-blue-500/20 text-blue-400";
      case "stopped":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const formatMemory = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatCpuUsage = (usage: number) => {
    return `${(usage / 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 terminal-text">
        <div>Loading processes...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold terminal-text">Process Manager</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => refetch()}
            className="bg-green-500 text-black hover:bg-green-400"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="bg-red-500 text-white hover:bg-red-400"
          >
            <Square className="h-4 w-4 mr-1" />
            Kill Process
          </Button>
        </div>
      </div>

      {/* Process Table */}
      <div className="terminal-panel rounded-lg border terminal-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-3 border-b terminal-border bg-gray-600/30 text-xs font-semibold terminal-muted uppercase tracking-wide">
          <div>PID</div>
          <div>Process Name</div>
          <div>User</div>
          <div>CPU %</div>
          <div>Memory</div>
          <div>Status</div>
        </div>

        {/* Table Body */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {processes.map((process) => (
            <div
              key={process.id}
              className="grid grid-cols-6 gap-4 p-3 border-b terminal-border/50 hover:bg-gray-600/20 text-sm font-mono group"
            >
              <div className="terminal-text">{process.pid}</div>
              <div className="terminal-text">{process.name}</div>
              <div className="terminal-muted">{process.user}</div>
              <div className={`${process.cpuUsage > 500 ? 'terminal-error' : process.cpuUsage > 200 ? 'terminal-warning' : 'terminal-success'}`}>
                {formatCpuUsage(process.cpuUsage)}
              </div>
              <div className="terminal-text">{formatMemory(process.memoryUsage)}</div>
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(process.status)}>
                  {process.status}
                </Badge>
                {process.pid !== 1 && ( // Don't allow killing init process
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => killProcess.mutate(process.pid)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-300"
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Process Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="terminal-panel border terminal-border rounded-lg p-4">
          <h3 className="text-sm font-semibold terminal-muted mb-2">Total Processes</h3>
          <div className="text-2xl font-bold terminal-text">{processes.length}</div>
        </div>
        <div className="terminal-panel border terminal-border rounded-lg p-4">
          <h3 className="text-sm font-semibold terminal-muted mb-2">Running</h3>
          <div className="text-2xl font-bold text-green-400">
            {processes.filter(p => p.status === "running").length}
          </div>
        </div>
        <div className="terminal-panel border terminal-border rounded-lg p-4">
          <h3 className="text-sm font-semibold terminal-muted mb-2">Average CPU</h3>
          <div className="text-2xl font-bold terminal-text">
            {processes.length > 0 
              ? formatCpuUsage(Math.round(processes.reduce((sum, p) => sum + p.cpuUsage, 0) / processes.length))
              : "0%"
            }
          </div>
        </div>
      </div>
    </div>
  );
}

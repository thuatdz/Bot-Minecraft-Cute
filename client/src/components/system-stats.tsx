import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import type { SystemStats } from "@shared/schema";

export default function SystemStats() {
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
    refetchInterval: 2000, // Update every 2 seconds
  });

  if (!stats) {
    return (
      <div className="p-3 border-t terminal-border">
        <div className="text-xs font-semibold terminal-muted uppercase tracking-wide mb-3">
          System Status
        </div>
        <div className="space-y-3">
          <div className="text-xs terminal-muted">Loading...</div>
        </div>
      </div>
    );
  }

  const cpuPercent = (stats.cpuUsage / 100);
  const memoryPercent = (stats.memoryUsed / stats.memoryTotal) * 100;
  const diskPercent = (stats.diskUsed / stats.diskTotal) * 100;

  return (
    <div className="p-3 border-t terminal-border">
      <h3 className="text-xs font-semibold terminal-muted uppercase tracking-wide mb-3">
        System Status
      </h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="terminal-muted">CPU</span>
            <span className="terminal-text">{cpuPercent.toFixed(1)}%</span>
          </div>
          <Progress 
            value={cpuPercent} 
            className="h-1.5 bg-gray-600"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="terminal-muted">Memory</span>
            <span className="terminal-text">
              {(stats.memoryUsed / 1024).toFixed(1)}/{(stats.memoryTotal / 1024).toFixed(1)} GB
            </span>
          </div>
          <Progress 
            value={memoryPercent} 
            className="h-1.5 bg-gray-600"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="terminal-muted">Disk</span>
            <span className="terminal-text">
              {(stats.diskUsed / 1024).toFixed(0)}/{(stats.diskTotal / 1024).toFixed(0)} GB
            </span>
          </div>
          <Progress 
            value={diskPercent} 
            className="h-1.5 bg-gray-600"
          />
        </div>
      </div>
    </div>
  );
}

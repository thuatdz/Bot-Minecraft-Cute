import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EthernetPort, TrendingUp, Plug } from "lucide-react";
import type { SystemStats } from "@shared/schema";

export default function NetworkMonitor() {
  // Get system stats for network data
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
    refetchInterval: 2000, // Update every 2 seconds
  });

  // Mock network interfaces data
  const networkInterfaces = [
    {
      name: "eth0",
      status: "UP",
      ip: "192.168.1.100/24",
      gateway: "192.168.1.1",
      mac: "00:16:3e:12:34:56",
    },
    {
      name: "lo",
      status: "UP",
      ip: "127.0.0.1/8",
      gateway: "-",
      mac: "00:00:00:00:00:00",
    },
  ];

  // Mock active connections
  const activeConnections = [
    {
      protocol: "TCP",
      localAddress: "192.168.1.100:22",
      remoteAddress: "192.168.1.200:54321",
      state: "ESTABLISHED",
      pid: "1024",
    },
    {
      protocol: "TCP",
      localAddress: "0.0.0.0:80",
      remoteAddress: "*:*",
      state: "LISTEN",
      pid: "nginx",
    },
    {
      protocol: "TCP",
      localAddress: "0.0.0.0:443",
      remoteAddress: "*:*",
      state: "LISTEN",
      pid: "nginx",
    },
    {
      protocol: "UDP",
      localAddress: "0.0.0.0:53",
      remoteAddress: "*:*",
      state: "LISTEN",
      pid: "systemd-resolved",
    },
  ];

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getConnectionStateColor = (state: string) => {
    switch (state.toUpperCase()) {
      case "ESTABLISHED":
        return "bg-green-500/20 text-green-400";
      case "LISTEN":
        return "bg-blue-500/20 text-blue-400";
      case "TIME_WAIT":
        return "bg-yellow-500/20 text-yellow-400";
      case "CLOSE_WAIT":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="flex-1 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Interfaces */}
        <Card className="terminal-panel border terminal-border">
          <CardHeader>
            <CardTitle className="terminal-text flex items-center gap-2">
              <EthernetPort className="h-5 w-5 terminal-accent" />
              Network Interfaces
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {networkInterfaces.map((iface) => (
              <div key={iface.name} className="p-3 bg-gray-600/30 rounded border terminal-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm terminal-text">{iface.name}</span>
                  <Badge className={`${iface.status === "UP" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {iface.status}
                  </Badge>
                </div>
                <div className="text-xs terminal-muted space-y-1">
                  <div>IP: {iface.ip}</div>
                  {iface.gateway !== "-" && <div>Gateway: {iface.gateway}</div>}
                  <div>MAC: {iface.mac}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Traffic Statistics */}
        <Card className="terminal-panel border terminal-border">
          <CardHeader>
            <CardTitle className="terminal-text flex items-center gap-2">
              <TrendingUp className="h-5 w-5 terminal-info" />
              Traffic Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="terminal-muted">Download</span>
                <span className="terminal-text">
                  {stats ? formatSpeed(stats.networkDownload * 1024) : "0 B/s"}
                </span>
              </div>
              <Progress 
                value={stats ? Math.min((stats.networkDownload / 2000) * 100, 100) : 0} 
                className="h-2 bg-gray-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="terminal-muted">Upload</span>
                <span className="terminal-text">
                  {stats ? formatSpeed(stats.networkUpload * 1024) : "0 B/s"}
                </span>
              </div>
              <Progress 
                value={stats ? Math.min((stats.networkUpload / 500) * 100, 100) : 0} 
                className="h-2 bg-gray-600"
              />
            </div>
            <div className="pt-2 border-t terminal-border">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="terminal-muted">Total RX:</span>
                  <div className="terminal-text font-mono">1.2 GB</div>
                </div>
                <div>
                  <span className="terminal-muted">Total TX:</span>
                  <div className="terminal-text font-mono">256 MB</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Connections */}
        <Card className="lg:col-span-2 terminal-panel border terminal-border">
          <CardHeader>
            <CardTitle className="terminal-text flex items-center gap-2">
              <Plug className="h-5 w-5 terminal-warning" />
              Active Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b terminal-border terminal-muted">
                    <th className="text-left p-2">Protocol</th>
                    <th className="text-left p-2">Local Address</th>
                    <th className="text-left p-2">Remote Address</th>
                    <th className="text-left p-2">State</th>
                    <th className="text-left p-2">PID</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {activeConnections.map((conn, index) => (
                    <tr key={index} className="border-b terminal-border/50 hover:bg-gray-600/20">
                      <td className="p-2 terminal-text">{conn.protocol}</td>
                      <td className="p-2 terminal-text">{conn.localAddress}</td>
                      <td className="p-2 terminal-text">{conn.remoteAddress}</td>
                      <td className="p-2">
                        <Badge className={getConnectionStateColor(conn.state)}>
                          {conn.state}
                        </Badge>
                      </td>
                      <td className="p-2 terminal-text">{conn.pid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Network Statistics */}
        <Card className="lg:col-span-2 terminal-panel border terminal-border">
          <CardHeader>
            <CardTitle className="terminal-text">Network Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold terminal-accent">
                  {activeConnections.filter(c => c.state === "ESTABLISHED").length}
                </div>
                <div className="text-xs terminal-muted">Active Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold terminal-info">
                  {activeConnections.filter(c => c.state === "LISTEN").length}
                </div>
                <div className="text-xs terminal-muted">Listening Ports</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold terminal-success">
                  {networkInterfaces.filter(i => i.status === "UP").length}
                </div>
                <div className="text-xs terminal-muted">Active Interfaces</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold terminal-warning">0</div>
                <div className="text-xs terminal-muted">Dropped Packets</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

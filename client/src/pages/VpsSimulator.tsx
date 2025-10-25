import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Server, Activity, Settings, Terminal, Wifi, HardDrive } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VPSConfig {
  dataUrl: string;
  secretKey: string;
  serverName: string;
  region: string;
  cpuCores: number;
  ramGB: number;
  storageGB: number;
}

interface ServerStats {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  uptime: string;
  status: 'online' | 'offline' | 'maintenance';
}

export default function VpsSimulator() {
  const [config, setConfig] = useState<VPSConfig>({
    dataUrl: 'https://api.minecraft-bots.com/v1/data/servers',
    secretKey: 'sk-mb_1234567890abcdef_your_minecraft_bot_api_key_here',
    serverName: 'MindzWeb-Bot-Server',
    region: 'Asia-Pacific',
    cpuCores: 4,
    ramGB: 8,
    storageGB: 100
  });

  const [stats, setStats] = useState<ServerStats>({
    cpuUsage: 45,
    ramUsage: 62,
    diskUsage: 38,
    uptime: '2d 14h 32m',
    status: 'online'
  });

  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    '[INFO] VPS Server initialized successfully',
    '[INFO] Minecraft Bot API connected',
    '[INFO] Data synchronization active',
    '[DEBUG] Secret key authenticated',
    '[INFO] MindzWeb Bot Management System ready'
  ]);

  const [command, setCommand] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Simulate real-time stats updates
    const interval = setInterval(() => {
      try {
        setStats(prev => ({
          ...prev,
          cpuUsage: Math.max(20, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
          ramUsage: Math.max(30, Math.min(95, prev.ramUsage + (Math.random() - 0.5) * 8)),
          diskUsage: Math.max(10, Math.min(80, prev.diskUsage + (Math.random() - 0.5) * 3))
        }));
      } catch (error) {
        console.error('Error updating stats:', error);
      }
    }, 30000); // Tăng từ 3s lên 30s để tránh spam

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const executeCommand = () => {
    try {
      if (!command.trim()) return;
      
      const newOutput = [...consoleOutput];
      newOutput.push(`> ${command}`);
      
      // Simulate command responses
      switch (command.toLowerCase()) {
        case 'status':
          newOutput.push(`[INFO] Server Status: ${stats.status.toUpperCase()}`);
          newOutput.push(`[INFO] Uptime: ${stats.uptime}`);
          break;
        case 'restart bot':
          newOutput.push('[INFO] Restarting Minecraft bot...');
          newOutput.push('[SUCCESS] Bot restarted successfully');
          break;
        case 'check api':
          newOutput.push(`[INFO] Data URL: ${config.dataUrl}`);
          newOutput.push('[SUCCESS] API connection healthy');
          break;
        case 'clear':
          setConsoleOutput([]);
          setCommand('');
          return;
        default:
          newOutput.push(`[ERROR] Unknown command: ${command}`);
      }
      
      setConsoleOutput(newOutput.slice(-10)); // Keep last 10 lines
      setCommand('');
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-purple-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🌸 VPS Simulator Kawaii 🌸
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Mô phỏng máy chủ ảo cho hệ thống quản lý bot Minecraft
          </p>
        </div>

        {/* Connection Status */}
        <Alert className={isConnected ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
          <AlertDescription className={isConnected ? 'text-green-800' : 'text-red-800'}>
            {isConnected ? 'Kết nối VPS thành công - Dữ liệu đang đồng bộ' : 'Mất kết nối VPS'}
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="config">Cấu hình</TabsTrigger>
            <TabsTrigger value="console">Console</TabsTrigger>
            <TabsTrigger value="monitoring">Giám sát</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-600">{stats.cpuUsage.toFixed(1)}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.cpuUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RAM Usage</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.ramUsage.toFixed(1)}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.ramUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.diskUsage.toFixed(1)}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.diskUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(stats.status)}`}></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{stats.status}</div>
                  <p className="text-xs text-muted-foreground">Uptime: {stats.uptime}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin máy chủ</CardTitle>
                <CardDescription>Chi tiết cấu hình VPS hiện tại</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Tên máy chủ</Label>
                    <p className="text-lg font-semibold text-pink-600">{config.serverName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vùng</Label>
                    <p className="text-lg">{config.region}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">CPU Cores</Label>
                    <p className="text-lg">{config.cpuCores} cores</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">RAM</Label>
                    <p className="text-lg">{config.ramGB} GB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình API và Secret Key</CardTitle>
                <CardDescription>Thiết lập kết nối dữ liệu và bảo mật</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataUrl">Data URL</Label>
                    <Input
                      id="dataUrl"
                      value={config.dataUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, dataUrl: e.target.value }))}
                      placeholder="https://api.minecraft-bots.com/v1/data/servers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      value={config.secretKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                      placeholder="sk-mb_1234567890abcdef..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serverName">Tên máy chủ</Label>
                    <Input
                      id="serverName"
                      value={config.serverName}
                      onChange={(e) => setConfig(prev => ({ ...prev, serverName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Vùng</Label>
                    <Input
                      id="region"
                      value={config.region}
                      onChange={(e) => setConfig(prev => ({ ...prev, region: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button className="bg-pink-500 hover:bg-pink-600">
                    Lưu cấu hình
                  </Button>
                  <Button variant="outline">
                    Test kết nối
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Console Tab */}
          <TabsContent value="console" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  VPS Console
                </CardTitle>
                <CardDescription>Điều khiển máy chủ qua dòng lệnh</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
                    {consoleOutput.map((line, index) => (
                      <div key={index} className="mb-1">{line}</div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Nhập lệnh (status, restart bot, check api, clear...)"
                      onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                      className="font-mono"
                    />
                    <Button onClick={executeCommand} className="bg-pink-500 hover:bg-pink-600">
                      Thực thi
                    </Button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Lệnh có sẵn: status, restart bot, check api, clear
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trạng thái API</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Data URL</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Secret Key</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Valid
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Bot Connection</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Connected
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nhật ký hệ thống</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="text-green-600">[15:45] API authenticated successfully</div>
                    <div className="text-blue-600">[15:44] Data synchronization completed</div>
                    <div className="text-yellow-600">[15:43] Bot behavior updated</div>
                    <div className="text-green-600">[15:42] VPS resources optimized</div>
                    <div className="text-blue-600">[15:41] System health check passed</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
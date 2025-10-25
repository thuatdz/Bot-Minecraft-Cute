import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal, Send, Trash2, Wifi, WifiOff } from "lucide-react";

interface ConsoleMessage {
  id: string;
  type: 'welcome' | 'console' | 'error';
  botId?: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  message: string;
  source?: 'user' | 'system' | 'chat' | 'bot' | 'action' | 'movement' | 'ai';
  timestamp: string;
}

interface WebConsoleProps {
  bots: any[];
}

export default function WebConsole({ bots }: WebConsoleProps) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [command, setCommand] = useState("");
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Kết nối WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'welcome',
        message: 'Chào mừng đến với bot loli! 💕 Console đã kết nối thành công!',
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        source: 'system',
        level: 'success'
      }]);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newMessage: ConsoleMessage = {
          id: Math.random().toString(36).substr(2, 9),
          ...data
        };
        setMessages(prev => [...prev, newMessage]);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  // Gửi lệnh
  const sendCommand = () => {
    if (!ws || !command.trim() || !selectedBotId) return;

    const message = {
      type: 'command',
      botId: selectedBotId,
      command: command.trim()
    };

    ws.send(JSON.stringify(message));
    setCommand("");
  };

  // Xóa console
  const clearConsole = () => {
    setMessages([]);
  };

  // Lấy màu cho các level khác nhau
  const getMessageColor = (level?: string, source?: string) => {
    if (source === 'user') return 'text-blue-400';
    if (source === 'chat') return 'text-purple-400';
    if (source === 'action') return 'text-pink-400';
    if (source === 'movement') return 'text-orange-400';
    if (source === 'ai') return 'text-cyan-400';
    
    switch (level) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-300';
      default: return 'text-gray-300';
    }
  };

  // Lấy icon cho source
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'user': return '>';
      case 'system': return '•';
      case 'chat': return '💬';
      case 'bot': return '🤖';
      case 'action': return '🎭';
      case 'movement': return '🚶';
      case 'ai': return '✨';
      default: return '→';
    }
  };

  return (
    <Card className="h-full bg-gradient-to-br from-gray-900 to-black border-pink-300/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="text-pink-400" size={20} />
            <CardTitle className="text-white">🎮 Web Console</CardTitle>
            <Badge variant={isConnected ? "default" : "destructive"} className="ml-2">
              {isConnected ? (
                <>
                  <Wifi size={12} className="mr-1" />
                  Kết nối
                </>
              ) : (
                <>
                  <WifiOff size={12} className="mr-1" />
                  Mất kết nối
                </>
              )}
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearConsole}
            className="border-pink-300/20 text-pink-300 hover:bg-pink-500/20"
          >
            <Trash2 size={14} className="mr-1" />
            Xóa
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bot selector */}
        <div className="flex space-x-2">
          <Select value={selectedBotId} onValueChange={setSelectedBotId}>
            <SelectTrigger className="bg-gray-800 border-pink-300/20 text-white">
              <SelectValue placeholder="Chọn bot để điều khiển" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-pink-300/20">
              {bots.map((bot) => (
                <SelectItem key={bot.id} value={bot.id} className="text-white hover:bg-pink-500/20">
                  🤖 {bot.username} ({bot.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Console output */}
        <div className="h-80 bg-black rounded-lg border border-pink-300/20 p-3 font-mono text-sm">
          <ScrollArea className="h-full">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                💕 Chào mừng đến PinkMineManager Console!
                <br />
                <span className="text-xs">Chọn bot và gửi lệnh để bắt đầu...</span>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start space-x-2">
                    <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                    <span className="text-gray-400 w-4 flex-shrink-0">
                      {getSourceIcon(msg.source)}
                    </span>
                    <span className={`${getMessageColor(msg.level, msg.source)} break-all`}>
                      {msg.botId && msg.source !== 'user' && (
                        <span className="text-pink-400">[{msg.botId?.slice(0, 8)}] </span>
                      )}
                      {msg.message}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Command input */}
        <div className="flex space-x-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
            placeholder="Nhập lệnh... (/start, /stop, /status, /say <message>)"
            disabled={!isConnected || !selectedBotId}
            className="flex-1 bg-gray-800 border-pink-300/20 text-white placeholder-gray-400"
          />
          <Button 
            onClick={sendCommand}
            disabled={!isConnected || !command.trim() || !selectedBotId}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            <Send size={16} />
          </Button>
        </div>

        {/* Command help */}
        <div className="text-xs text-gray-400 space-y-1 bg-gray-800/50 rounded p-3">
          <div className="text-pink-300 font-semibold">📚 Lệnh khả dụng:</div>
          <div><span className="text-blue-400">/start</span> - Khởi động bot</div>
          <div><span className="text-blue-400">/stop</span> - Dừng bot</div>
          <div><span className="text-blue-400">/status</span> - Kiểm tra trạng thái bot</div>
          <div><span className="text-blue-400">/say &lt;tin nhắn&gt;</span> - Gửi tin nhắn qua bot</div>
        </div>
      </CardContent>
    </Card>
  );
}
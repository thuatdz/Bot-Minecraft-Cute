import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Settings, Square, Monitor, Loader2 } from "lucide-react";
import { Bot } from "@shared/schema";
import { useBots } from "@/hooks/use-bots";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface BotCardProps {
  bot: Bot;
  onConfigure: () => void;
}

export default function BotCard({ bot, onConfigure }: BotCardProps) {
  const { startBot, stopBot } = useBots();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showScreen, setShowScreen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusShadow = (status: string) => {
    switch (status) {
      case 'online':
        return 'bot-status-online';
      case 'error':
        return 'bot-status-offline';
      default:
        return '';
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await startBot.mutateAsync(bot.id);
      toast({
        title: "Success",
        description: `Bot ${bot.username} started successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to start bot ${bot.username}. ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await stopBot.mutateAsync(bot.id);
      toast({
        title: "Success",
        description: `Bot ${bot.username} stopped successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to stop bot ${bot.username}. ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <Card className={`bg-white/80 backdrop-blur-sm shadow-lg ${getStatusShadow(bot.status)}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{bot.username}</h3>
          <Badge className={`${getStatusColor(bot.status)} text-white`}>
            {bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-gray-600">
            Server: <span className="font-medium">{bot.server}</span>
          </p>
          <p className="text-gray-600">
            Username: <span className="font-medium">{bot.username}</span>
          </p>
          <p className="text-gray-600">
            {bot.status === 'online' ? 'Uptime' : 'Last seen'}:
            <span className="font-medium ml-1">
              {bot.status === 'online'
                ? formatUptime(bot.uptime ?? 0)
                : bot.lastSeen
                  ? new Date(bot.lastSeen).toLocaleString()
                  : 'Never'
              }
            </span>
          </p>
        </div>

        <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStart}
                  disabled={isLoading || bot.status === 'online'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Đang khởi động...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {bot.status === 'online' ? 'Bot đang chạy' : 'Khởi động Bot'}
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfigOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Cấu hình
                </Button>
              </div>
      </CardContent>
    </Card>
    </>
  );
}
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useBots } from "@/hooks/use-bots";
import { UpdateBotConfig } from "@shared/schema";

interface BotConfigModalProps {
  botId: string;
  open: boolean;
  onClose: () => void;
}

export default function BotConfigModal({ botId, open, onClose }: BotConfigModalProps) {
  const { bots, updateBotConfig } = useBots();
  const bot = bots?.find(b => b.id === botId);
  
  const [config, setConfig] = useState<UpdateBotConfig>({
    autoReconnect: true,
    chatEnabled: true,
    movementPattern: "random",
    responseDelay: 1000,
  });

  useEffect(() => {
    if (bot) {
      setConfig({
        autoReconnect: bot.autoReconnect ?? true,
        chatEnabled: bot.chatEnabled ?? true,
        movementPattern: bot.movementPattern ?? "random",
        responseDelay: bot.responseDelay ?? 1000,
      });
    }
  }, [bot]);

  const handleSave = async () => {
    await updateBotConfig.mutateAsync({ botId, config });
    onClose();
  };

  const handleReset = () => {
    if (bot) {
      setConfig({
        autoReconnect: bot.autoReconnect,
        chatEnabled: bot.chatEnabled,
        movementPattern: bot.movementPattern,
        responseDelay: bot.responseDelay,
      });
    }
  };

  if (!bot) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-purple-600">
            🛠️ Bot Configuration - {bot.username}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
          <div>
            <h4 className="text-lg font-medium text-gray-800 mb-4">Basic Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoReconnect" className="text-sm font-medium text-gray-700">
                  Auto-Reconnect
                </Label>
                <Switch
                  id="autoReconnect"
                  checked={config.autoReconnect ?? true}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, autoReconnect: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="chatEnabled" className="text-sm font-medium text-gray-700">
                  Chat Messages
                </Label>
                <Switch
                  id="chatEnabled"
                  checked={config.chatEnabled ?? true}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, chatEnabled: checked }))
                  }
                />
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-gray-800 mb-4">Advanced Features</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Movement Pattern
                </Label>
                <Select
                  value={config.movementPattern ?? "random"}
                  onValueChange={(value) => 
                    setConfig(prev => ({ ...prev, movementPattern: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random Walk</SelectItem>
                    <SelectItem value="follow">Follow Player</SelectItem>
                    <SelectItem value="stay">Stay in Place</SelectItem>
                    <SelectItem value="custom">Custom Path</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Response Delay (ms)
                </Label>
                <Input
                  type="number"
                  min="100"
                  max="5000"
                  value={config.responseDelay ?? 1000}
                  onChange={(e) => 
                    setConfig(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 1000 }))
                  }
                  className="border-pink-200 focus:border-pink-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateBotConfig.isPending}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            {updateBotConfig.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

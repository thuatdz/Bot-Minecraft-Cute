import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Settings, Loader2, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface BotConfig {
  botName: string;
  serverHost: string;
  serverPort: number;
  version: string;
}

export default function BotConfigForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentConfig, setCurrentConfig] = useState<BotConfig>({
    botName: 'botlolicute',
    serverHost: '',
    serverPort: 25565,
    version: '1.19.4'
  });
  const [formData, setFormData] = useState<BotConfig>({
    botName: 'botlolicute',
    serverHost: '',
    serverPort: 25565,
    version: '1.19.4'
  });
  const { toast } = useToast();

  // Load current config when component mounts
  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bot/config');
      const data = await response.json();
      
      if (data.success) {
        setCurrentConfig(data.config);
        setFormData(data.config);
      }
    } catch (error) {
      console.error('Lỗi tải cấu hình:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setProgress(0);

    try {
      // Simulate progress update
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 400);

      const response = await fetch('/api/bot/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      // Complete progress
      setProgress(100);
      
      setTimeout(() => {
        if (data.success) {
          setCurrentConfig(formData);
          toast({
            title: "Thành công!",
            description: "Cấu hình bot đã được cập nhật. Bot sẽ tự động kết nối lại với thông tin mới.",
          });
          setIsOpen(false);
        } else {
          toast({
            title: "Lỗi!",
            description: data.error || "Không thể cập nhật cấu hình bot",
            variant: "destructive",
          });
        }
        setIsUpdating(false);
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Lỗi cập nhật cấu hình:', error);
      toast({
        title: "Lỗi kết nối!",
        description: "Không thể kết nối đến server",
        variant: "destructive",
      });
      setIsUpdating(false);
      setProgress(0);
    }
  };

  const handleInputChange = (field: keyof BotConfig, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-full shadow-lg transform transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cấu Hình Bot
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-sm border-2 border-pink-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-pink-500" />
            Cấu Hình Bot Lolicute
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            <span className="ml-2 text-purple-600">Đang tải cấu hình...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Config Display */}
            <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-600 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Cấu Hình Hiện Tại
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-purple-600">Bot:</span>
                    <Badge variant="secondary" className="ml-2">{currentConfig.botName}</Badge>
                  </div>
                  <div>
                    <span className="font-medium text-purple-600">Version:</span>
                    <Badge variant="secondary" className="ml-2">{currentConfig.version}</Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-purple-600">Server:</span>
                    <Badge variant="secondary" className="ml-2">
                      {currentConfig.serverHost}:{currentConfig.serverPort}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Update Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botName" className="text-purple-600 font-medium">
                  Tên Bot
                </Label>
                <Input
                  id="botName"
                  type="text"
                  value={formData.botName}
                  onChange={(e) => handleInputChange('botName', e.target.value)}
                  placeholder="botlolicute"
                  className="border-pink-200 focus:border-pink-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serverHost" className="text-purple-600 font-medium">
                  Địa Chỉ Server
                </Label>
                <Input
                  id="serverHost"
                  type="text"
                  value={formData.serverHost}
                  onChange={(e) => handleInputChange('serverHost', e.target.value)}
                  placeholder="example.aternos.me"
                  className="border-pink-200 focus:border-pink-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serverPort" className="text-purple-600 font-medium">
                    Port
                  </Label>
                  <Input
                    id="serverPort"
                    type="number"
                    value={formData.serverPort}
                    onChange={(e) => handleInputChange('serverPort', parseInt(e.target.value) || 25565)}
                    placeholder="25565"
                    className="border-pink-200 focus:border-pink-400"
                    min="1"
                    max="65535"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version" className="text-purple-600 font-medium">
                    Phiên Bản MC
                  </Label>
                  <Input
                    id="version"
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    placeholder="1.19.4"
                    className="border-pink-200 focus:border-pink-400"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              {isUpdating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-600">Đang cập nhật cấu hình...</span>
                    <span className="text-pink-500">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isUpdating}
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang Cập Nhật...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Cập Nhật Bot
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Heart, Utensils, MapPin, Sword, Shield, RefreshCw } from "lucide-react";

interface BotScreenData {
  connected: boolean;
  health: number;
  food: number;
  position: { x: number; y: number; z: number };
  mode: string;
  currentAction: string;
  nearbyEntities: Array<{ name: string; distance: string }>;
  inventory: Array<{ name: string; count: number }>;
  equipment?: {
    weapon: string | null;
    armor: Array<string | null>;
  };
  targetPlayer?: string | null;
  status?: string;
  reconnectAttempts?: number;
  timestamp: string;
}

interface BotScreenProps {
  botId: string;
  botName: string;
}

export default function BotScreen({ botId, botName }: BotScreenProps) {
  const [screenData, setScreenData] = useState<BotScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScreenData = async () => {
    if (!botId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bots/${botId}/screen`);
      if (response.ok) {
        const data = await response.json();
        console.log('📱 Bot screen data received:', {
          connected: data.connected,
          health: data.health,
          food: data.food,
          hasEquipment: !!data.equipment,
          inventoryCount: data.inventory?.length || 0
        });
        setScreenData(data);
      } else {
        console.error('Failed to fetch bot screen:', response.status);
      }
    } catch (error) {
      console.error("Error fetching bot screen:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync mỗi 5 giây từ botlolicute.ts
  useEffect(() => {
    fetchScreenData();
    
    const interval = setInterval(fetchScreenData, 5000); // Auto-sync mỗi 5 giây
    return () => clearInterval(interval);
  }, [botId]);

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'protecting': return 'bg-red-500';
      case 'following': return 'bg-blue-500';
      case 'autofarming': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'protecting': return <Shield size={16} />;
      case 'following': return <MapPin size={16} />;
      case 'autofarming': return <Sword size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  if (!screenData) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-pink-300/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Monitor className="mr-2 text-pink-400" size={20} />
            🖥️ Bot Screen: {botName}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-gray-400">
            {isLoading ? "Đang tải..." : "Chọn bot để xem màn hình"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div 
      className="min-h-screen p-4"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <div className="max-w-md mx-auto space-y-4">
        {/* Header card with bot icon and main status */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl border border-white/10">
          <div className="text-4xl mb-3">🤖</div>
          <div className="text-white/90 text-base mb-2">Bot Status</div>
          <div className="text-yellow-300 text-lg font-bold leading-tight">
            Tọa độ: {Math.floor(screenData.position.x)}, {Math.floor(screenData.position.y)}, {Math.floor(screenData.position.z)} | HP: {screenData.health}/20 | Đồ ăn: {screenData.food}/20
          </div>
        </div>

        {/* Position card */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl border border-white/10">
          <div className="text-3xl mb-3">📍</div>
          <div className="text-white/90 text-base mb-2">Vị trí</div>
          <div className="text-yellow-300 text-xl font-bold">
            {Math.floor(screenData.position.x)}, {Math.floor(screenData.position.y)}, {Math.floor(screenData.position.z)}
          </div>
        </div>

        {/* Health card */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl border border-white/10">
          <div className="text-3xl mb-3">❤️</div>
          <div className="text-white/90 text-base mb-2">Máu</div>
          <div className="text-yellow-300 text-xl font-bold">
            {screenData.health}/20
          </div>
        </div>

        {/* Food card */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl border border-white/10">
          <div className="text-3xl mb-3">🍞</div>
          <div className="text-white/90 text-base mb-2">Đồ ăn</div>
          <div className="text-yellow-300 text-xl font-bold">
            {screenData.food}/20
          </div>
        </div>

        {/* Equipment section */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-white/10">
          <div className="text-gray-800 text-lg font-bold mb-4 text-center flex items-center justify-center">
            🎒 Túi đồ & Trang bị (Cập nhật mỗi 5s)
            <button 
              onClick={() => window.open('/bot-view', 'botview', 'width=400,height=600,scrollbars=yes')}
              className="ml-3 px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
            >
              👁️ Xem ảnh
            </button>
          </div>
          
          <div className="text-gray-700 text-sm mb-3 font-medium">
            ⚔️ Trang bị hiện tại:
          </div>
          <div className="space-y-2">
            <div className="bg-gray-100 p-2 rounded-lg border-l-4 border-green-500 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">Tay phải</span>
              <span className="text-gray-600 text-xs font-semibold">
                {screenData.equipment?.hand || 'Trống'}
              </span>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg border-l-4 border-green-500 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">Tay trái</span>
              <span className="text-gray-600 text-xs font-semibold">
                {screenData.equipment?.offhand || 'Trống'}
              </span>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">Mũ</span>
              <span className="text-gray-600 text-xs font-semibold">
                {screenData.equipment?.helmet || 'Trống'}
              </span>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">Áo</span>
              <span className="text-gray-600 text-xs font-semibold">
                {screenData.equipment?.chestplate || 'Trống'}
              </span>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">Quần</span>
              <span className="text-gray-600 text-xs font-semibold">
                {screenData.equipment?.leggings || 'Trống'}
              </span>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">Giày</span>
              <span className="text-gray-600 text-xs font-semibold">
                {screenData.equipment?.boots || 'Trống'}
              </span>
            </div>
          </div>

          <div className="text-gray-700 text-sm mb-2 mt-4 font-medium">
            📦 Túi đồ ({screenData.inventory?.length || 0} items):
          </div>
          <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-2">
            {screenData.inventory && screenData.inventory.length > 0 ? (
              <div className="space-y-1">
                {screenData.inventory.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-white rounded px-2 py-1">
                    <span className="font-medium text-gray-700">{item.displayName || item.name}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs py-2">Túi đồ trống</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

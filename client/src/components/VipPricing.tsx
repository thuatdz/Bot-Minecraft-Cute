import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Facebook, Youtube } from "lucide-react";

export default function VipPricing() {
  return (
    <section id="vip" className="py-20 px-4">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-purple-600 text-center mb-12">
          ✨ VIP Features ✨
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Basic Plan */}
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-pink-200 transition-all">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Basic</h3>
              <div className="text-4xl font-bold text-pink-500 mb-2">Free</div>
              <p className="text-gray-600 mb-6">Tính năng cơ bản</p>
              
              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">1 Bot cùng lúc</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Cấu hình cơ bản</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Support cộng đồng</span>
                </li>
              </ul>
              
              <Button className="w-full bg-gray-300 text-gray-700 cursor-default" disabled>
                Đang sử dụng
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-pink-500 transform scale-105 relative">
            <Badge className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-pink-500 text-white">
              Phổ biến
            </Badge>
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Premium</h3>
              <div className="text-4xl font-bold text-pink-500 mb-2">50k VND</div>
              <p className="text-gray-600 mb-6">Mỗi tháng</p>
              
              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">5 Bot cùng lúc</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Tính năng AI thông minh</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Auto-farm nâng cao</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>
              
              <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white">
                Nâng cấp ngay
              </Button>
            </CardContent>
          </Card>

          {/* VIP Plan */}
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-purple-500 transition-all">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">VIP</h3>
              <div className="text-4xl font-bold text-purple-600 mb-2">100k VND</div>
              <p className="text-gray-600 mb-6">Mỗi tháng</p>
              
              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited Bot</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Custom scripting</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">24/7 dedicated support</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-700">Tính năng độc quyền</span>
                </li>
              </ul>
              
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Liên hệ ngay
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-lg text-gray-700 mb-4">
            💰 Để nâng cấp hoặc có thắc mắc, hãy liên hệ qua Facebook hoặc YouTube!
          </p>
          <div className="flex justify-center space-x-4">
            <Button asChild className="bg-blue-500 hover:bg-blue-600">
              <a href="https://www.facebook.com/le.van.nam.21737" target="_blank" rel="noopener noreferrer">
                <Facebook className="mr-2 h-4 w-4" />
                Chat Facebook
              </a>
            </Button>
            <Button asChild className="bg-red-500 hover:bg-red-600">
              <a href="https://m.youtube.com/@duythien2k6" target="_blank" rel="noopener noreferrer">
                <Youtube className="mr-2 h-4 w-4" />
                Xem YouTube
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

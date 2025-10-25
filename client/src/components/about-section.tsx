import { Rocket, Palette, Smartphone } from "lucide-react";

export default function AboutSection() {
  const features = [
    {
      icon: <Rocket className="w-6 h-6 text-blue-600" />,
      title: "Hiệu suất nhanh",
      description: "Được tối ưu hóa cho tốc độ và hiệu quả, đảm bảo người dùng có trải nghiệm tốt nhất trên mọi thiết bị.",
      bgColor: "bg-blue-100"
    },
    {
      icon: <Palette className="w-6 h-6 text-emerald-600" />,
      title: "Thiết kế hiện đại",
      description: "Thẩm mỹ sạch sẽ, hiện đại, luôn phù hợp và hấp dẫn trong khi duy trì sự hấp dẫn chuyên nghiệp.",
      bgColor: "bg-emerald-100"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-purple-600" />,
      title: "Thiết kế responsive",
      description: "Thích ứng mượt mà với mọi kích thước màn hình, mang lại trải nghiệm nhất quán trên desktop, tablet và mobile.",
      bgColor: "bg-purple-100"
    }
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4" data-testid="about-title">Về mindz</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto" data-testid="about-description">
            Chúng tôi tin vào việc tạo ra những trải nghiệm kỹ thuật số vừa đẹp vừa có chức năng, 
            kết hợp công nghệ tiên tiến với các nguyên tắc thiết kế vượt thời gian.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow duration-300"
              data-testid={`feature-card-${index}`}
            >
              <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4" data-testid={`feature-title-${index}`}>
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed" data-testid={`feature-description-${index}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
import { Zap, Shield, Heart, LifeBuoy } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-mindz-blue" />,
      title: "Fast Performance",
      description: "Optimized for speed and efficiency across all devices and platforms."
    },
    {
      icon: <Shield className="w-8 h-8 text-mindz-blue" />,
      title: "Secure & Reliable", 
      description: "Built with security best practices and enterprise-grade reliability."
    },
    {
      icon: <Heart className="w-8 h-8 text-mindz-blue" />,
      title: "User-Focused",
      description: "Designed with your users in mind for maximum engagement and satisfaction."
    },
    {
      icon: <LifeBuoy className="w-8 h-8 text-mindz-blue" />,
      title: "24/7 Support",
      description: "Continuous support and maintenance to keep your project running smoothly."
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-mindz-dark mb-4">Why Choose Mindz</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We deliver exceptional results through our commitment to quality, innovation, and client success.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-mindz-dark mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

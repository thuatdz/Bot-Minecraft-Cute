import { Code, Brush, Search, TrendingUp, Shield, Headphones, ArrowRight } from "lucide-react";

export default function ServicesSection() {
  const services = [
    {
      icon: <Code className="w-8 h-8 text-blue-600" />,
      title: "Web Development",
      description: "Custom web applications built with modern technologies and best practices for optimal performance.",
      bgColor: "bg-blue-100"
    },
    {
      icon: <Brush className="w-8 h-8 text-emerald-600" />,
      title: "UI/UX Design",
      description: "User-centered design solutions that prioritize usability while maintaining visual excellence.",
      bgColor: "bg-emerald-100"
    },
    {
      icon: <Search className="w-8 h-8 text-purple-600" />,
      title: "SEO Optimization",
      description: "Strategic optimization to improve your website's visibility and search engine rankings.",
      bgColor: "bg-purple-100"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-orange-600" />,
      title: "Performance Optimization",
      description: "Speed and performance enhancements to ensure the best user experience and faster load times.",
      bgColor: "bg-orange-100"
    },
    {
      icon: <Shield className="w-8 h-8 text-red-600" />,
      title: "Security & Maintenance",
      description: "Ongoing security monitoring and maintenance to keep your website safe and up-to-date.",
      bgColor: "bg-red-100"
    },
    {
      icon: <Headphones className="w-8 h-8 text-indigo-600" />,
      title: "24/7 Support",
      description: "Round-the-clock technical support to ensure your website runs smoothly at all times.",
      bgColor: "bg-indigo-100"
    }
  ];

  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4" data-testid="services-title">Our Services</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto" data-testid="services-description">
            Comprehensive solutions for your digital presence, from concept to deployment.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300"
              data-testid={`service-card-${index}`}
            >
              <div className={`w-16 h-16 ${service.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                {service.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4" data-testid={`service-title-${index}`}>
                {service.title}
              </h3>
              <p className="text-slate-600 mb-6" data-testid={`service-description-${index}`}>
                {service.description}
              </p>
              <button className="text-primary-600 font-medium hover:text-primary-700 transition-colors duration-300 flex items-center gap-1" data-testid={`service-link-${index}`}>
                Learn more <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

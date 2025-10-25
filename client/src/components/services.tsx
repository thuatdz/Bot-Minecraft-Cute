import { Monitor, Smartphone, Zap, ArrowRight } from "lucide-react";

export default function Services() {
  const services = [
    {
      icon: <Monitor className="w-6 h-6 text-white" />,
      title: "Web Development",
      description: "Modern, responsive websites built with the latest technologies and best practices for optimal performance.",
      bgColor: "bg-mindz-blue"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-white" />,
      title: "UI/UX Design", 
      description: "User-centered design that creates intuitive and engaging experiences across all digital touchpoints.",
      bgColor: "bg-mindz-sky"
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: "Digital Strategy",
      description: "Comprehensive digital strategies that align with your business goals and drive measurable results.",
      bgColor: "bg-mindz-dark"
    }
  ];

  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-mindz-dark mb-4">Our Services</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We offer comprehensive digital solutions tailored to your specific needs and goals.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className={`w-12 h-12 ${service.bgColor} rounded-lg flex items-center justify-center mb-6`}>
                {service.icon}
              </div>
              <h3 className="text-xl font-semibold text-mindz-dark mb-4">{service.title}</h3>
              <p className="text-gray-600 mb-6">
                {service.description}
              </p>
              <button className="text-mindz-blue font-medium hover:text-mindz-sky transition-colors duration-200 flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you as soon as possible.",
      });
      
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6 text-primary-600" />,
      label: "Email",
      value: "hello@mindz.com",
      bgColor: "bg-primary-100"
    },
    {
      icon: <Phone className="w-6 h-6 text-primary-600" />,
      label: "Phone",
      value: "+1 (555) 123-4567",
      bgColor: "bg-primary-100"
    },
    {
      icon: <MapPin className="w-6 h-6 text-primary-600" />,
      label: "Address",
      value: "123 Design Street, Tech City",
      bgColor: "bg-primary-100"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4" data-testid="contact-title">Get In Touch</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto" data-testid="contact-description">
            Ready to start your project? Let's discuss how we can help bring your vision to life.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-6" data-testid="contact-info-title">Contact Information</h3>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-center" data-testid={`contact-info-${index}`}>
                    <div className={`w-12 h-12 ${info.bgColor} rounded-lg flex items-center justify-center mr-4`}>
                      {info.icon}
                    </div>
                    <div>
                      <p className="text-slate-600 text-sm">{info.label}</p>
                      <p className="text-slate-800 font-medium" data-testid={`contact-${info.label.toLowerCase()}`}>{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="contact-form">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-300" 
                    placeholder="Your name"
                    required
                    data-testid="input-name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-300" 
                    placeholder="your@email.com"
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-300" 
                    placeholder="Tell us about your project..."
                    required
                    data-testid="textarea-message"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  data-testid="button-submit"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

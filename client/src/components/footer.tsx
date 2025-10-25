import { Twitter, Linkedin, Github } from "lucide-react";

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const socialLinks = [
    { icon: <Twitter className="w-5 h-5" />, href: "#", label: "Twitter" },
    { icon: <Linkedin className="w-5 h-5" />, href: "#", label: "LinkedIn" },
    { icon: <Github className="w-5 h-5" />, href: "#", label: "GitHub" }
  ];

  const quickLinks = [
    { name: "Home", sectionId: "home" },
    { name: "About", sectionId: "about" },
    { name: "Services", sectionId: "services" },
    { name: "Contact", sectionId: "contact" }
  ];

  return (
    <footer className="bg-slate-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4" data-testid="footer-brand">mindz</h3>
            <p className="text-slate-300 leading-relaxed max-w-md" data-testid="footer-description">
              Creating beautiful, functional web experiences that inspire and engage your audience with thoughtful design and modern technology.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4" data-testid="footer-links-title">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={() => scrollToSection(link.sectionId)}
                    className="text-slate-300 hover:text-white transition-colors duration-300"
                    data-testid={`footer-link-${link.name.toLowerCase()}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Social Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4" data-testid="footer-social-title">Follow Us</h4>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.href} 
                  className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors duration-300"
                  aria-label={social.label}
                  data-testid={`social-link-${social.label.toLowerCase()}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-700 mt-8 pt-8 text-center">
          <p className="text-slate-300" data-testid="footer-copyright">© 2024 mindz. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-blue-600" data-testid="logo-mindz">mindz</h1>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button 
                onClick={() => scrollToSection('home')}
                className="text-slate-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-300"
                data-testid="nav-home"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className="text-slate-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-300"
                data-testid="nav-about"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('services')}
                className="text-slate-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-300"
                data-testid="nav-services"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-slate-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-300"
                data-testid="nav-contact"
              >
                Contact
              </button>
            </div>
          </div>
          
          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors duration-300"
              data-testid="mobile-menu-button"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200" data-testid="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button 
              onClick={() => scrollToSection('home')}
              className="text-slate-600 hover:text-blue-600 block px-3 py-2 text-base font-medium transition-colors duration-300 w-full text-left"
              data-testid="mobile-nav-home"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-slate-600 hover:text-blue-600 block px-3 py-2 text-base font-medium transition-colors duration-300 w-full text-left"
              data-testid="mobile-nav-about"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('services')}
              className="text-slate-600 hover:text-blue-600 block px-3 py-2 text-base font-medium transition-colors duration-300 w-full text-left"
              data-testid="mobile-nav-services"
            >
              Services
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className="text-slate-600 hover:text-blue-600 block px-3 py-2 text-base font-medium transition-colors duration-300 w-full text-left"
              data-testid="mobile-nav-contact"
            >
              Contact
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
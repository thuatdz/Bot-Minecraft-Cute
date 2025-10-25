import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header 
      className={`bg-white sticky top-0 z-50 transition-shadow duration-200 ${
        isScrolled ? "shadow-sm" : ""
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-mindz-blue">mindz</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button 
                onClick={() => scrollToSection("home")}
                className="text-mindz-gray hover:text-mindz-blue transition-colors duration-200 px-3 py-2 text-sm font-medium"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection("about")}
                className="text-mindz-gray hover:text-mindz-blue transition-colors duration-200 px-3 py-2 text-sm font-medium"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection("services")}
                className="text-mindz-gray hover:text-mindz-blue transition-colors duration-200 px-3 py-2 text-sm font-medium"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection("contact")}
                className="text-mindz-gray hover:text-mindz-blue transition-colors duration-200 px-3 py-2 text-sm font-medium"
              >
                Contact
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-mindz-gray hover:text-mindz-blue focus:outline-none focus:text-mindz-blue"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg">
              <button 
                onClick={() => scrollToSection("home")}
                className="text-mindz-gray hover:text-mindz-blue block px-3 py-2 text-base font-medium w-full text-left"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection("about")}
                className="text-mindz-gray hover:text-mindz-blue block px-3 py-2 text-base font-medium w-full text-left"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection("services")}
                className="text-mindz-gray hover:text-mindz-blue block px-3 py-2 text-base font-medium w-full text-left"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection("contact")}
                className="text-mindz-gray hover:text-mindz-blue block px-3 py-2 text-base font-medium w-full text-left"
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

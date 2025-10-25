import { Button } from "@/components/ui/button";

export default function Hero() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section id="home" className="bg-gradient-to-br from-mindz-blue to-mindz-sky">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
            Welcome to <span className="text-blue-200">mindz</span>
          </h1>
          <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Innovative digital solutions designed for the modern world. We create experiences that matter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => scrollToSection("services")}
              className="bg-white text-mindz-blue px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200 shadow-lg"
            >
              Get Started
            </Button>
            <Button 
              onClick={() => scrollToSection("about")}
              variant="outline"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-mindz-blue transition-colors duration-200"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

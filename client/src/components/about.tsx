import { Check } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-mindz-dark mb-4">About Mindz</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We are a forward-thinking company dedicated to creating digital experiences that combine beautiful design with powerful functionality.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="Modern office workspace" 
              className="rounded-xl shadow-lg w-full h-auto" 
            />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-mindz-dark mb-6">Our Vision</h3>
            <p className="text-gray-600 mb-6">
              At Mindz, we believe in the power of thoughtful design and innovative technology to solve real-world problems. Our team combines creativity with technical expertise to deliver solutions that exceed expectations.
            </p>
            <p className="text-gray-600 mb-8">
              We focus on creating user-centered experiences that are not only functional but also delightful to use. Every project we undertake is an opportunity to push boundaries and explore new possibilities.
            </p>
            <div className="flex items-center text-mindz-blue">
              <Check className="w-5 h-5 mr-2" />
              <span className="font-medium">Innovation-driven approach</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

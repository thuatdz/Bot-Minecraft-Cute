export default function HeroSection() {
  return (
    <section id="home" className="pt-20 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold text-slate-800 mb-6 leading-tight" data-testid="hero-title">
            mind<span className="text-blue-600">z</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-8 font-light leading-relaxed" data-testid="hero-description">
            Tạo ra những trải nghiệm web hiện đại, sạch sẽ, truyền cảm hứng và thu hút người dùng với thiết kế chu đáo và chức năng mượt mà.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              data-testid="button-get-started"
            >
              Bắt đầu
            </button>
            <button 
              className="border-2 border-slate-300 text-slate-700 px-8 py-3 rounded-lg font-medium hover:border-blue-600 hover:text-blue-600 transition-colors duration-300"
              data-testid="button-learn-more"
            >
              Tìm hiểu thêm
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
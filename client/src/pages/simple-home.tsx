import { Link } from "wouter";

export default function SimpleHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-purple-600 mb-8">
          mindz
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A simple, clean web page
        </p>
        <div className="space-y-4">
          <Link 
            href="/" 
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Access Bot Management System
          </Link>
          <br />
          <Link 
            href="/vps" 
            className="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            VPS Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
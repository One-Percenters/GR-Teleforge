import Image from "next/image";
import Link from "next/link";
import ParticleBackground from "./components/ParticleBackground";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header Section */}
      <header 
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-red-950 px-6 bg-cover bg-center bg-no-repeat relative overflow-hidden">
        <ParticleBackground />
        
        {/* Racing stripe effects */}
        <div className="absolute inset-0 opacity-10 z-[1]">
          <div className="absolute top-0 left-1/4 w-1 h-full bg-red-500 transform -skew-x-12"></div>
          <div className="absolute top-0 right-1/4 w-1 h-full bg-white transform -skew-x-12"></div>
        </div>
        
        <div className="text-center relative z-10 pointer-events-none">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter uppercase">
            <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">G</span>
            <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">R</span>
            <span className="ml-5 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">Teleforge</span>
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-zinc-300 mb-4 tracking-wider uppercase">
            Past + Present = <span className="text-red-500 font-black">Future</span>
          </p>
          <div className="flex justify-center items-center gap-6 mt-8 pointer-events-auto w-full">
            <Link href="/race">
              <button className="px-10 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-lg uppercase tracking-wider border-2 border-red-500 hover:border-white hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-105 transition-all duration-200">
                Try Now
              </button>
            </Link>
            <a href="https://devpost.com/software/gazoo-tracking" target="_blank" rel="noopener noreferrer">
              <button className="px-10 py-4 bg-transparent text-white font-black text-lg uppercase tracking-wider border-2 border-zinc-600 hover:border-white hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-200">
                Learn More
              </button>
            </a>
          </div>      
        </div>
      </header>
    </div>
  );
}

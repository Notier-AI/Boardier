import Link from "next/link";
import Image from "next/image";
import { PenTool, Sparkles, Github, ArrowRight, MousePointerClick, Book, GitBranch } from "lucide-react";
import HeroSelectAnimation from "./components/HeroSelectAnimation";
import ScrollReveal from "./components/ScrollReveal";
import StaggerChildren from "./components/StaggerChildren";
import { RoughnessDemo, FreehandDemo, ColorDemo, FillStyleDemo, AIGenerateDemo, StrokeWidthDemo } from "./components/FeatureDemos";
import DrawOnScroll, { DOODLE_ARROW_RIGHT, DOODLE_UNDERLINE } from "./components/DrawOnScroll";
import ParallaxDoodles from "./components/ParallaxDoodles";
import ThemeToggle from "./components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-kalam">
      {/* Parallax doodle scribbles floating in the margins */}
      <ParallaxDoodles />

      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between border-b-2 border-root-fg border-dashed">
        <div className="flex items-center gap-3">
          <div className="sketch-border p-2 bg-brand-yellow text-root-fg animate-wiggle" style={{ animationDelay: "0.5s" }}>
            <PenTool size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold font-caveat tracking-wider leading-none">Boardier</h1>
            <a href="https://notier.ai" target="_blank" className="text-xs text-root-fg/70 hover:text-brand-blue flex items-center gap-1 font-sans mt-0.5 group">
              <span>built by</span>
              <Image src="/notiericon.png" alt="Notier.ai Icon" width={12} height={12} className="rounded-[2px] group-hover:scale-125 transition-transform" />
              <span className="font-semibold sketch-underline">Notier.ai</span>
            </a>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/docs" className="sketch-button px-3 py-1.5 flex items-center gap-2 hover:bg-brand-blue hover:text-white group">
            <Book size={18} />
            <span className="hidden sm:inline group-hover:text-white">Docs</span>
          </Link>
          <Link href="/changelog" className="sketch-button px-3 py-1.5 flex items-center gap-2 hover:bg-brand-green hover:text-white group">
            <GitBranch size={18} />
            <span className="hidden sm:inline group-hover:text-white">Changelog</span>
          </Link>
          <a href="https://github.com" className="sketch-button px-3 py-1.5 flex items-center gap-2 hover:bg-brand-red hover:text-white group">
            <Github size={18} />
            <span className="hidden sm:inline group-hover:text-white">GitHub</span>
          </a>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
        <ScrollReveal delay={100} direction="none">
          <div className="sketch-border bg-brand-blue/10 px-4 py-1 text-brand-blue mb-8 rotate-[-2deg] flex items-center gap-2 animate-float">
            <Sparkles size={16} className="animate-pulse-soft" /> <span>AI Focused. No License needed.</span>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={200}>
          <h2 className="text-5xl md:text-7xl font-bold font-caveat mb-6 leading-tight">
            The purely community-made <HeroSelectAnimation />
          </h2>
        </ScrollReveal>
        
        <ScrollReveal delay={350}>
          <p className="text-xl md:text-2xl text-root-fg/80 mb-10 max-w-2xl leading-relaxed">
            Free, open source, and designed for unconstrained thinking. 
            Boardier is a flexible workspace where your ideas and AI capabilities flow naturally.
          </p>
        </ScrollReveal>
        
        <ScrollReveal delay={500}>
          <div className="flex flex-col sm:flex-row gap-6 mb-16">
            <Link href="/demo" className="sketch-button !bg-brand-green text-white text-xl px-8 py-4 flex items-center gap-2 rotate-1 hover:rotate-0 hover:!bg-[#00b548] group">
              <MousePointerClick size={24} className="group-hover:animate-[wiggle_0.4s_ease-in-out]" />
              Try the Demo
            </Link>
            <a href="#features" className="sketch-button bg-card-bg text-root-fg text-xl px-8 py-4 flex items-center gap-2 -rotate-1 hover:rotate-0 group">
              Learn More <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </ScrollReveal>

        {/* Sketchy connector arrow drawn on scroll between hero CTA and features */}
        <div className="w-full flex justify-center my-4">
          <DrawOnScroll
            path={DOODLE_ARROW_RIGHT}
            color="var(--boardier-green)"
            strokeWidth={2}
            width={200}
            height={60}
            className="w-48 h-12 opacity-40"
          />
        </div>

        {/* Interactive Feature Demos */}
        <div id="features" className="w-full mt-12">
          <ScrollReveal delay={100} direction="none">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold font-caveat mb-2">Play With It</h2>
              <p className="text-root-fg/60 text-lg">These are real. Go ahead, interact.</p>
              {/* Wavy underline that draws itself on scroll */}
              <div className="flex justify-center mt-2">
                <DrawOnScroll
                  path={DOODLE_UNDERLINE}
                  color="var(--boardier-red)"
                  strokeWidth={2.5}
                  width={280}
                  height={70}
                  className="w-56 h-5 opacity-50"
                />
              </div>
            </div>
          </ScrollReveal>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full" stagger={150}>
            <RoughnessDemo />
            <FreehandDemo />
            <ColorDemo />
            <FillStyleDemo />
            <AIGenerateDemo />
            <StrokeWidthDemo />
          </StaggerChildren>
        </div>

        {/* Mock Window Illustration */}
        <ScrollReveal delay={100} distance={50}>
          <div className="w-full max-w-3xl mt-24 sketch-card overflow-hidden hover-lift">
            <div className="border-b-2 border-root-fg bg-brand-green/5 p-3 flex justify-between items-center">
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded-full bg-brand-red sketch-border hover:scale-150 transition-transform cursor-pointer"></div>
                <div className="w-4 h-4 rounded-full bg-brand-blue sketch-border hover:scale-150 transition-transform cursor-pointer"></div>
                <div className="w-4 h-4 rounded-full bg-brand-yellow sketch-border hover:scale-150 transition-transform cursor-pointer"></div>
              </div>
              <div className="h-2 w-32 bg-root-fg/30 rounded-full animate-shimmer"></div>
              <div className="w-4 h-4"></div>
            </div>
            <div className="p-8 flex items-center justify-center bg-card-bg aspect-video relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle, var(--dot-grid-color) 1px, transparent 1px)`, backgroundSize: "20px 20px" }}></div>
              
              <div className="relative w-48 h-36 sm:w-64 sm:h-48 sketch-box border-brand-blue flex items-center justify-center rotate-[-3deg] bg-card-bg shadow-[4px_4px_0px_#2979ff] hover:rotate-0 transition-transform duration-500 group/box cursor-default">
                <span className="text-lg sm:text-2xl font-caveat text-brand-blue group-hover/box:scale-105 transition-transform">Interactive Canvas</span>
              </div>
              <div className="absolute w-32 h-24 sm:w-48 sm:h-32 sketch-box border-brand-red flex items-center justify-center rotate-[5deg] bg-card-bg shadow-[4px_4px_0px_#ff3b3b] ml-24 mt-20 sm:ml-48 sm:mt-32 hover:rotate-0 transition-transform duration-500 cursor-default animate-float" style={{ animationDelay: "0.5s" }}>
                <span className="text-base sm:text-xl font-caveat text-brand-red">Your ideas here!</span>
              </div>
              <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-brand-green border-dashed flex items-center justify-center -rotate-[15deg] bg-brand-green/5 -ml-40 -mt-12 sm:-ml-64 sm:-mt-16 hover:rotate-0 transition-transform duration-500 cursor-default animate-float" style={{ animationDelay: "1s" }}>
                <span className="text-base sm:text-xl font-caveat text-brand-green">Auto-layout</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </main>

      {/* Footer */}
      <footer className="mt-20 p-6 border-t-2 border-root-fg flex flex-col items-center gap-6 bg-card-bg-hover text-center">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <p className="text-lg">&copy; {new Date().getFullYear()} Boardier Project. No rights reserved. Free for everyone.</p>
          <div className="flex gap-4">
            <Link href="/demo" className="sketch-underline hover:text-brand-blue">Demo</Link>
            <Link href="/docs" className="sketch-underline hover:text-brand-red">Documentation</Link>
            <Link href="/changelog" className="sketch-underline hover:text-brand-green">Changelog</Link>
          </div>
        </div>
        <div className="pt-6 pb-2 border-t-2 border-root-fg/20 border-dashed w-full max-w-md flex items-center justify-center">
          <a href="https://notier.ai" target="_blank" className="group flex items-center gap-3 hover:-translate-y-1 transition-transform sketch-button px-5 py-2.5 bg-root-bg">
            <span className="font-sans text-xs uppercase tracking-widest text-root-fg/60">Built by</span>
            <Image src="/notiericon.png" alt="Notier.ai" width={20} height={20} className="rounded-sm group-hover:scale-110 group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-lg font-sans text-brand-blue">Notier.ai</span>
          </a>
        </div>
      </footer>
    </div>
  );
}


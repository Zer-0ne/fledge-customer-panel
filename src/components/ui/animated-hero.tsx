'use client';

import * as React from 'react';
import { useGSAP } from '@gsap/react';
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { gsap } from 'gsap';
import { Sparkles, Building2, Search, Timer } from 'lucide-react';

interface AnimatedHeroProps {
  colleges: { id: string; name: string }[];
  selectedCollegeId: string;
  setSelectedCollegeId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleHeroSearch: (e: React.FormEvent) => void;
}

export function AnimatedHero({
  colleges,
  selectedCollegeId,
  setSelectedCollegeId,
  searchQuery,
  setSearchQuery,
  handleHeroSearch,
}: AnimatedHeroProps) {
  const badgeRef = React.useRef<HTMLDivElement>(null);
  const headlineRef = React.useRef<HTMLHeadingElement>(null);
  const subheadlineRef = React.useRef<HTMLParagraphElement>(null);
  const searchFormRef = React.useRef<HTMLFormElement>(null);
  const statsRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Animate badge
    gsap.fromTo(
      badgeRef.current,
      { opacity: 0, y: 20, scale: 0.9 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.8, 
        ease: 'back.out(1.7)',
        delay: 0.2
      }
    );

    // Animate headline
    gsap.fromTo(
      headlineRef.current,
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'back.out(1.7)',
        delay: 0.4
      }
    );

    // Animate subheadline
    gsap.fromTo(
      subheadlineRef.current,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.6, 
        ease: 'power.out(3)',
        delay: 0.6
      }
    );

    // Animate search form
    gsap.fromTo(
      searchFormRef.current,
      { opacity: 0, y: 40 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'back.out(1.7)',
        delay: 0.8
      }
    );

    // Animate stats with stagger
    gsap.fromTo(
      statsRef.current,
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'back.out(1.7)',
        delay: 1.0
      }
    );
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div ref={badgeRef} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6 shadow-xs">
            <Sparkles className="size-3.5" />
            <AnimatedShinyText>Verified Student Housing Near Your Campus</AnimatedShinyText>
          </div>

          {/* Main Headline */}
          <h1 ref={headlineRef} className="max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
            Find Your Ideal Flat Near <span className="text-primary bg-gradient-to-r from-primary to-primary/70 bg-clip-text">Campus</span>
          </h1>
          <p ref={subheadlineRef} className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Explore verified student apartments, shared flats, and PG accommodations around top universities with zero hassle.
          </p>

          {/* Quick Search Card */}
          <form ref={searchFormRef} onSubmit={handleHeroSearch} className="mt-8 w-full max-w-3xl rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-lg backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
              {/* College Selector */}
              <div className="sm:col-span-5 relative text-left">
                <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">
                  Select College
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 size-4 text-muted-foreground z-10 pointer-events-none" />
                  <select
                    value={selectedCollegeId}
                    onChange={(e) => setSelectedCollegeId(e.target.value)}
                    className="pl-9 text-sm"
                  >
                    <option value="">All Colleges</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keyword Search */}
              <div className="sm:col-span-5 text-left">
                <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">
                  Location or Keywords
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground z-10 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. 2 BHK, Koramangala, North Campus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2 flex items-end">
                <button type="submit" className="w-full gap-2 rounded-xl sm:mt-5">
                  <Search className="size-4" />
                  <span>Search</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Stats / Highlights */}
          <div ref={statsRef} className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground sm:text-3xl">100%</span>
              <span className="text-xs text-muted-foreground">Verified Properties</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground sm:text-3xl">Direct</span>
              <span className="text-xs text-muted-foreground">Owner Communication</span>
            </div>
            <div className="flex flex-col items-center col-span-2 sm:col-span-1">
              <span className="text-2xl font-bold text-foreground sm:text-3xl">Zero</span>
              <span className="text-xs text-muted-foreground">Hidden Fees</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
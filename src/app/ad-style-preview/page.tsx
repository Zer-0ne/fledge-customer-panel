'use client';

/**
 * Ad style preview — STANDARD / BOOST / PREMIUM sponsored cards
 * with realistic advertiser content for the flat-sharing app:
 * campus cafes, restaurants and PGs (Stitch design system kept).
 */
import * as React from 'react';
import { ArrowUpRight, ChevronRight, FlipVertical2, MoreHorizontal } from 'lucide-react';

const IMG_CAFE =
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=70';

const IMG_RESTAURANT =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=70';

const IMG_PG_ROOM =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70';

const IMG_MAX_PG =
  'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=70';

/** Dark gradient fallback if a hero image ever fails to load. */
const DARK_FALLBACK =
  'radial-gradient(120% 90% at 22% 8%, #33333d 0%, rgba(51,51,61,0) 52%),' +
  'radial-gradient(110% 85% at 88% 18%, #262634 0%, rgba(38,38,52,0) 55%),' +
  'radial-gradient(90% 70% at 12% 88%, #1b1b26 0%, rgba(27,27,38,0) 60%),' +
  'linear-gradient(160deg, #101016 0%, #0a0a0e 55%, #050507 100%)';

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

/** backdrop-filter must be inline — the CSS pipeline strips it from stylesheets. */
const GLASS_BLUR: React.CSSProperties = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

export default function AdStylePreviewPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden bg-[#0a0a0e] px-4 py-16">
      {/* reference typography — Hanken Grotesk display + JetBrains Mono labels */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@500&display=swap"
      />
      {/* subtle volumetric haze */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-full -translate-x-1/2 rounded-full bg-[#d2bbff]/8 blur-[130px]"
      />

      <div className="relative w-full max-w-md">
        {/* ============ STANDARD AD — campus cafe ============ */}
        <section>
          <p className="font-mono-jb mb-2 text-[10px] uppercase tracking-[0.3em] text-white/30">Standard</p>
          <article
            className="ad-glass-surface flex flex-col gap-3 rounded-xl border border-white/5 p-4"
            style={GLASS_BLUR}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded border border-[#c4c7c7]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#c4c7c7]/60">
                  Sponsored
                </span>
                <span className="font-mono-jb text-[11px] text-[#c4c7c7]/80">Brew &amp; Bites Cafe</span>
              </div>
              <button
                type="button"
                aria-label="More options"
                className="text-[#c4c7c7]/40 transition-colors hover:text-[#e5e2e1]"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>

            <div className="flex gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-[#20201f]">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview asset */}
                <img src={IMG_CAFE} alt="" className="h-full w-full object-cover grayscale-[0.2]" onError={hideOnError} />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <h3 className="text-sm font-semibold leading-tight text-[#e5e2e1]">
                  Flat whites, cold coffee &amp; fresh croissants — 2 mins from North Gate
                </h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono-jb text-[11px] font-bold text-[#d2bbff]">Learn More</span>
                  <ChevronRight className="size-4 text-[#d2bbff]" />
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* ============ BOOST AD — student restaurant ============ */}
        <section className="mt-10">
          <p className="font-mono-jb mb-2 text-[10px] uppercase tracking-[0.3em] text-white/30">Boost</p>
          <article
            className="ad-glass-surface ad-titanium-edge overflow-hidden rounded-xl bg-gradient-to-b from-[#20201f]/50 to-[#131313]"
            style={GLASS_BLUR}
          >
            <div className="relative h-56 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview asset */}
              <img
                src={IMG_RESTAURANT}
                alt=""
                className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
                onError={hideOnError}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-black/30" />
              <div className="absolute left-4 top-4 flex gap-2">
                <span className="rounded-sm bg-[#d2bbff]/90 px-3 py-1 text-[10px] font-bold text-[#3f008e] shadow-xl backdrop-blur-md">
                  Boosted
                </span>
                <span className="rounded-sm border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
                  Sponsored
                </span>
              </div>
            </div>

            <div className="p-6">
              <span className="font-mono-jb mb-2 block text-[11px] font-bold tracking-widest text-[#d2bbff]/80">
                Student Offer
              </span>
              <h3 className="font-display-hanken mb-6 text-2xl font-bold leading-tight text-[#e5e2e1]">
                Authentic thalis, momos &amp; shakes — 10% off with your Student ID
              </h3>
              <button
                type="button"
                className="w-full rounded bg-[#e9c349] py-4 text-xs font-bold uppercase tracking-widest text-[#3c2f00] shadow-lg shadow-[#e9c349]/10 transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              >
                Get 10% Off
              </button>
            </div>
          </article>
        </section>

        {/* ============ PREMIUM AD — PG residences ============ */}
        <section className="mt-10">
          <p className="font-mono-jb mb-2 text-[10px] uppercase tracking-[0.3em] text-white/30">Premium</p>
          <div className="relative">
            {/* titanium edge frame */}
            <div className="relative aspect-[4/5] rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-white/5 p-0.5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]">
              <div className="relative h-full w-full overflow-hidden rounded-[calc(1rem-2px)] bg-[#131313]">
                {/* room hero */}
                <div aria-hidden className="absolute inset-0" style={{ background: DARK_FALLBACK }} />
                {/* eslint-disable-next-line @next/next/no-img-element -- preview asset */}
                <img
                  src={IMG_PG_ROOM}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
                  onError={hideOnError}
                />
                {/* cinematic gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                {/* top row — badge + wordmark */}
                <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
                  <span className="rounded-sm border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-lg">
                    Premium Partner
                  </span>
                  <span className="font-mono-jb text-[10px] uppercase tracking-widest text-white/40">
                    Nest Residences
                  </span>
                </div>

                {/* bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h2 className="font-display-hanken mb-8 text-3xl font-bold leading-tight text-white">
                    Fully furnished PG near campus — all-inclusive from ₹9,999/mo
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 rounded bg-white py-4 text-xs font-bold uppercase tracking-widest text-black shadow-2xl transition-all duration-300 hover:bg-[#d2bbff] active:scale-95"
                    >
                      Book a Visit <ArrowUpRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="View Details"
                      className="flex size-14 shrink-0 items-center justify-center rounded border border-white/20 bg-black/40 text-white backdrop-blur-xl transition-transform active:scale-90"
                    >
                      <FlipVertical2 className="size-5" />
                    </button>
                  </div>
                  <p className="font-mono-jb mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
                    Flip to View Details
                  </p>
                </div>
              </div>
            </div>

            {/* contact shadow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-10 left-1/2 h-16 w-4/5 -translate-x-1/2 rounded-[100%] bg-black/70 blur-2xl"
            />

            {/* carousel dots */}
            <div className="mt-6 flex justify-center gap-2">
              <div className="h-0.5 w-2 rounded-full bg-[#d2bbff]" />
              <div className="h-0.5 w-1 rounded-full bg-white/10" />
              <div className="h-0.5 w-1 rounded-full bg-white/10" />
            </div>
          </div>
        </section>

        {/* ============ MAXIMUM AD — premium PG residences ============ */}
        <section className="mt-10">
          <p className="font-mono-jb mb-2 text-[10px] uppercase tracking-[0.3em] text-white/30">Maximum</p>
          <div className="relative">
            {/* travelling-light frame (MAXIMUM tier) */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl p-[1.5px] shadow-[0_24px_50px_-15px_rgba(0,0,0,0.7)]">
              {/* spinning conic light — shows through the 1.5px frame gap */}
              <div
                aria-hidden
                className="ad-max-spin absolute inset-[-100%]"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, rgba(210,187,255,0.85) 45deg, rgba(233,195,73,0.85) 90deg, transparent 135deg, transparent 360deg)',
                }}
              />
              <div className="relative h-full w-full overflow-hidden rounded-[calc(1rem-1.5px)] bg-[#101014]">
                {/* room hero */}
                <div aria-hidden className="absolute inset-0" style={{ background: DARK_FALLBACK }} />
                {/* eslint-disable-next-line @next/next/no-img-element -- preview asset */}
                <img
                  src={IMG_MAX_PG}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-[1.03] object-cover"
                  onError={hideOnError}
                />
                {/* cinematic gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/20" />

                {/* top row — badge + wordmark */}
                <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
                  <span className="rounded-sm border border-[#e9c349]/40 bg-[#e9c349]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#e9c349] backdrop-blur-lg">
                    Exclusive Partner
                  </span>
                  <span className="font-mono-jb text-[10px] uppercase tracking-widest text-white/45">
                    Skyline Residences
                  </span>
                </div>

                {/* bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h2 className="font-display-hanken mb-4 text-[30px] font-bold leading-tight text-white">
                    The city&apos;s finest student residence — premium studios &amp; suites
                  </h2>

                  {/* amenity chips */}
                  <div className="mb-6 flex flex-wrap gap-1.5">
                    {['Wi-Fi 6', 'AC Rooms', 'Meals Included', 'Housekeeping'].map((a) => (
                      <span
                        key={a}
                        className="rounded-sm border border-white/15 bg-white/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-md"
                      >
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 rounded bg-white py-4 text-xs font-bold uppercase tracking-widest text-black shadow-2xl transition-all duration-300 hover:bg-[#e9c349] active:scale-95"
                    >
                      Book a Visit <ArrowUpRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="View Details"
                      className="flex size-14 shrink-0 items-center justify-center rounded border border-white/20 bg-black/40 text-white backdrop-blur-xl transition-transform active:scale-90"
                    >
                      <FlipVertical2 className="size-5" />
                    </button>
                  </div>

                  <p className="font-mono-jb mt-5 text-center text-[10px] uppercase tracking-[0.3em] text-white/35">
                    All-inclusive from ₹12,999/mo
                  </p>
                </div>
              </div>
            </div>

            {/* carousel dots */}
            <div className="mt-6 flex justify-center gap-2">
              <div className="h-0.5 w-2 rounded-full bg-[#e9c349]" />
              <div className="h-0.5 w-1 rounded-full bg-white/10" />
              <div className="h-0.5 w-1 rounded-full bg-white/10" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

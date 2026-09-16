'use client';

/**
 * BorderGlow — reduced to a single gradient hairline (2026-09).
 *
 * The previous implementation shipped BorderGlow.css plus JS-driven glow
 * animations (7 radial gradients + rAF loops) around every card, drawer and
 * auth panel — 17 call sites, all of them competing for attention. The design
 * system now has exactly one signature surface treatment
 * (`globals.css` → `.fl-gradient-border`), so this keeps its public API
 * (<BorderGlow className>{children}</BorderGlow>) and renders that.
 */
export default function BorderGlow({ className = '', children, ...props }) {
  return (
    <div className={`fl-gradient-border ${className}`} {...props}>
      {children}
    </div>
  );
}

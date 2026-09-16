import { describe, it, expect } from "vitest";
import { decideProxyAction } from "@/proxy";

describe("decideProxyAction — customer panel route protection", () => {
  describe("public paths", () => {
    it("passes supported auth pages and blocks retired OTP login", () => {
      expect(decideProxyAction({ pathname: "/login", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/signup", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/otp", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/otp", isAuthenticated: true })).toEqual({ type: "redirect", to: "/dashboard" });
    });

    it("passes the contact-approval email deep link", () => {
      expect(
        decideProxyAction({ pathname: "/contact-approval/abc123", isAuthenticated: false })
      ).toEqual({ type: "pass" });
    });

    it("passes the ad-style design preview", () => {
      expect(decideProxyAction({ pathname: "/ad-style-preview", isAuthenticated: false })).toEqual({ type: "pass" });
    });

    it("passes company and legal pages", () => {
      expect(decideProxyAction({ pathname: "/about", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/faq", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/contact", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/privacy", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/terms", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/pricing", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/refunds", isAuthenticated: false })).toEqual({ type: "pass" });
    });

    it("passes the public donation page so guests can contribute", () => {
      expect(decideProxyAction({ pathname: "/donate", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/donate", isAuthenticated: true })).toEqual({ type: "pass" });
    });

    it("passes the public browse surfaces — landing, search and listing detail", () => {
      expect(decideProxyAction({ pathname: "/", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/search", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/search/", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/listings/abc-123", isAuthenticated: false })).toEqual({ type: "pass" });
      // A sibling route that only shares the prefix stays gated.
      expect(decideProxyAction({ pathname: "/search-history", isAuthenticated: false })).toEqual({
        type: "redirect",
        to: "/login",
      });
    });
  });

  describe("protected paths", () => {
    it("redirects unauthenticated users on protected routes", () => {
      expect(decideProxyAction({ pathname: "/dashboard", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/messages/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/need-now/new", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/settings", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
    });

    it("protects pages that require a session identity", () => {
      expect(decideProxyAction({ pathname: "/properties/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/roommates", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/users/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
    });

    it("passes authenticated users everywhere", () => {
      expect(decideProxyAction({ pathname: "/dashboard", isAuthenticated: true })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/", isAuthenticated: true })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/search", isAuthenticated: true })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/messages/abc-123", isAuthenticated: true })).toEqual({ type: "pass" });
    });
  });
});

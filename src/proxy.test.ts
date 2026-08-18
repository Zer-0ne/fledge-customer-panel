import { describe, it, expect } from "vitest";
import { decideProxyAction } from "@/proxy";

describe("decideProxyAction — customer panel route protection", () => {
  describe("public paths", () => {
    it("passes auth pages for unauthenticated users", () => {
      expect(decideProxyAction({ pathname: "/login", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/signup", isAuthenticated: false })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/otp", isAuthenticated: false })).toEqual({ type: "pass" });
    });

    it("passes the contact-approval email deep link", () => {
      expect(
        decideProxyAction({ pathname: "/contact-approval/abc123", isAuthenticated: false })
      ).toEqual({ type: "pass" });
    });

    it("passes the ad-style design preview", () => {
      expect(decideProxyAction({ pathname: "/ad-style-preview", isAuthenticated: false })).toEqual({ type: "pass" });
    });
  });

  describe("protected paths", () => {
    it("protects the home page — login required", () => {
      expect(decideProxyAction({ pathname: "/", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/", isAuthenticated: true })).toEqual({ type: "pass" });
    });

    it("redirects unauthenticated users on protected routes", () => {
      expect(decideProxyAction({ pathname: "/dashboard", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/messages/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/need-now/new", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/settings", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
    });

    it("protects discovery pages that fire API calls", () => {
      expect(decideProxyAction({ pathname: "/search", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/listings/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/properties/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/roommates", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/users/abc-123", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
      expect(decideProxyAction({ pathname: "/donate", isAuthenticated: false })).toEqual({ type: "redirect", to: "/login" });
    });

    it("passes authenticated users everywhere", () => {
      expect(decideProxyAction({ pathname: "/dashboard", isAuthenticated: true })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/search", isAuthenticated: true })).toEqual({ type: "pass" });
      expect(decideProxyAction({ pathname: "/messages/abc-123", isAuthenticated: true })).toEqual({ type: "pass" });
    });
  });
});

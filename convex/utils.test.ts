import { describe, it, expect } from "vitest";
import { cosineSimilarity, clamp01, hashString } from "./utils";

describe("utils", () => {
  describe("cosineSimilarity", () => {
    it("should compute cosine similarity correctly", () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it("should handle negative similarity", () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
    });

    it("should throw error for different length vectors", () => {
      const a = [1, 0];
      const b = [1, 0, 0];
      expect(() => cosineSimilarity(a, b)).toThrow();
    });
  });

  describe("clamp01", () => {
    it("should clamp values between 0 and 1", () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(2)).toBe(1);
    });
  });

  describe("hashString", () => {
    it("should produce consistent hashes", () => {
      const str = "test string";
      const hash1 = hashString(str);
      const hash2 = hashString(str);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different strings", () => {
      const hash1 = hashString("test1");
      const hash2 = hashString("test2");
      expect(hash1).not.toBe(hash2);
    });
  });
});

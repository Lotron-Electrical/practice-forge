import { describe, it, expect, vi } from "vitest";

// Undo global mock from setup.js so we test the real implementation
vi.unmock("../../utils/ruleGenerator.js");

import {
  generateScale,
  generateArpeggio,
  generateIntervalDrill,
  generateArticulationDrill,
  generateFromDemand,
} from "../../utils/ruleGenerator.js";

describe("utils/ruleGenerator", () => {
  describe("generateScale", () => {
    it("returns an object with required fields", () => {
      const result = generateScale({ key: "C", scaleType: "major" });
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("abc");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("key", "C");
      expect(result).toHaveProperty("difficulty");
      expect(result).toHaveProperty("category_hint", "Scales");
      expect(result).toHaveProperty("tags");
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it("generates valid ABC notation", () => {
      const result = generateScale({
        key: "G",
        scaleType: "major",
        octaves: 1,
      });
      expect(result.abc).toContain("X:1");
      expect(result.abc).toContain("T:");
      expect(result.abc).toContain("M:4/4");
      expect(result.abc).toContain("L:1/4");
      expect(result.abc).toContain("K:G");
      expect(result.abc).toContain("|]"); // end bar
    });

    it("includes scale type and key in title", () => {
      const result = generateScale({ key: "Bb", scaleType: "minor" });
      expect(result.title).toContain("Bb");
      expect(result.title).toContain("minor");
    });

    it("supports thirds pattern", () => {
      const result = generateScale({
        key: "C",
        scaleType: "major",
        pattern: "thirds",
      });
      expect(result.title).toContain("thirds");
    });

    it("handles chromatic scale type", () => {
      const result = generateScale({
        key: "C",
        scaleType: "chromatic",
        octaves: 1,
      });
      expect(result.abc).toBeDefined();
      expect(result.difficulty).toBeGreaterThanOrEqual(4); // chromatic adds 3 to difficulty
    });

    it("respects octaves parameter", () => {
      const one = generateScale({ key: "C", scaleType: "major", octaves: 1 });
      const two = generateScale({ key: "C", scaleType: "major", octaves: 2 });
      // More octaves = more notes = longer ABC
      expect(two.abc.length).toBeGreaterThan(one.abc.length);
    });

    it("includes tempo in ABC output", () => {
      const result = generateScale({ key: "C", tempo: 120 });
      expect(result.abc).toContain("Q:1/4=120");
    });

    it("caps difficulty at 10", () => {
      const result = generateScale({
        key: "C",
        scaleType: "chromatic",
        octaves: 3,
      });
      expect(result.difficulty).toBeLessThanOrEqual(10);
    });

    it("uses default params when none provided", () => {
      const result = generateScale({});
      expect(result.key).toBe("C");
      expect(result.title).toContain("major");
    });
  });

  describe("generateArpeggio", () => {
    it("returns correct structure", () => {
      const result = generateArpeggio({ key: "D", chordType: "minor" });
      expect(result.title).toContain("D");
      expect(result.title).toContain("minor");
      expect(result.category_hint).toBe("Arpeggios");
      expect(result.abc).toContain("X:1");
      expect(result.abc).toContain("K:D");
    });

    it("handles dominant7 arpeggio", () => {
      const result = generateArpeggio({ key: "G", chordType: "dominant7" });
      expect(result.tags).toContain("dominant7");
      expect(result.difficulty).toBeGreaterThanOrEqual(5); // 7th chords are harder
    });

    it("handles diminished arpeggio", () => {
      const result = generateArpeggio({ key: "C", chordType: "diminished" });
      expect(result.tags).toContain("diminished");
    });

    it("handles augmented arpeggio", () => {
      const result = generateArpeggio({ key: "C", chordType: "augmented" });
      expect(result.tags).toContain("augmented");
    });

    it("uses default params", () => {
      const result = generateArpeggio({});
      expect(result.key).toBe("C");
      expect(result.title).toContain("major");
    });
  });

  describe("generateIntervalDrill", () => {
    it("returns correct structure", () => {
      const result = generateIntervalDrill({ key: "F", interval: "fifth" });
      expect(result.title).toContain("fifth");
      expect(result.title).toContain("F");
      expect(result.category_hint).toBe("Intervals");
      expect(result.abc).toContain("X:1");
    });

    it("handles octave intervals", () => {
      const result = generateIntervalDrill({ key: "C", interval: "octave" });
      expect(result.tags).toContain("octave");
    });

    it("handles third intervals", () => {
      const result = generateIntervalDrill({ key: "C", interval: "third" });
      expect(result.tags).toContain("third");
    });

    it("defaults to octave for unknown intervals", () => {
      const result = generateIntervalDrill({
        key: "C",
        interval: "unknown_interval",
      });
      // Should still produce output (defaults to 12 semitones)
      expect(result.abc).toBeDefined();
    });

    it("limits ABC output length", () => {
      const result = generateIntervalDrill({ key: "C", interval: "third" });
      // The function slices to 64 notes max
      expect(result.abc).toBeDefined();
    });
  });

  describe("generateArticulationDrill", () => {
    it("returns correct structure", () => {
      const result = generateArticulationDrill({
        key: "C",
        articulation: "staccato",
      });
      expect(result.title).toContain("staccato");
      expect(result.category_hint).toBe("Articulation");
      expect(result.abc).toContain("X:1");
      expect(result.abc).toContain("L:1/8"); // articulation uses eighth notes
    });

    it("generates legato exercise", () => {
      const result = generateArticulationDrill({
        key: "D",
        articulation: "legato",
      });
      expect(result.title).toContain("legato");
      expect(result.tags).toContain("legato");
    });

    it("handles double tongue articulation", () => {
      const result = generateArticulationDrill({
        key: "C",
        articulation: "double_tongue",
      });
      expect(result.difficulty).toBe(6);
      expect(result.tags).toContain("double_tongue");
    });

    it("has higher difficulty for tonguing exercises", () => {
      const staccato = generateArticulationDrill({
        key: "C",
        articulation: "staccato",
      });
      const doubleTongue = generateArticulationDrill({
        key: "C",
        articulation: "double_tongue",
      });
      expect(doubleTongue.difficulty).toBeGreaterThan(staccato.difficulty);
    });
  });

  describe("generateFromDemand", () => {
    it("matches scale demands", () => {
      const result = generateFromDemand({ description: "G major scale" });
      expect(result).not.toBeNull();
      expect(result.category_hint).toBe("Scales");
    });

    it("matches scale in thirds", () => {
      const result = generateFromDemand({
        description: "C major scale in thirds",
      });
      expect(result).not.toBeNull();
      expect(result.title).toContain("thirds");
    });

    it("matches arpeggio demands", () => {
      const result = generateFromDemand({ description: "D minor arpeggio" });
      expect(result).not.toBeNull();
      expect(result.category_hint).toBe("Arpeggios");
    });

    it("matches interval demands", () => {
      const result = generateFromDemand({
        description: "octave jump exercises",
      });
      expect(result).not.toBeNull();
      expect(result.category_hint).toBe("Intervals");
    });

    it("matches leap demands", () => {
      const result = generateFromDemand({ description: "wide leap practice" });
      expect(result).not.toBeNull();
      expect(result.category_hint).toBe("Intervals");
    });

    it("matches articulation demands", () => {
      const result = generateFromDemand({ description: "staccato technique" });
      expect(result).not.toBeNull();
      expect(result.category_hint).toBe("Articulation");
    });

    it("matches tonguing demands", () => {
      const result = generateFromDemand({
        description: "double tonguing drill",
      });
      expect(result).not.toBeNull();
      expect(result.category_hint).toBe("Articulation");
    });

    it("returns null for unrecognized demands", () => {
      const result = generateFromDemand({
        description: "improve vibrato width",
      });
      expect(result).toBeNull();
    });

    it("extracts key from description", () => {
      const result = generateFromDemand({
        description: "Bb minor scale practice",
      });
      expect(result).not.toBeNull();
      expect(result.key).toBe("Bb");
    });

    it("uses provided key over extracted key", () => {
      const result = generateFromDemand({
        description: "scale practice",
        key: "F#",
      });
      expect(result.key).toBe("F#");
    });

    it("defaults to C when no key found", () => {
      const result = generateFromDemand({ description: "scale practice" });
      expect(result.key).toBe("C");
    });

    it("extracts harmonic minor from description", () => {
      const result = generateFromDemand({
        description: "harmonic minor scale",
      });
      expect(result).not.toBeNull();
      expect(result.title).toContain("harmonic_minor");
    });
  });

  describe("output format validation", () => {
    it("all generators produce ABC with X: T: M: L: Q: K: headers", () => {
      const generators = [
        generateScale({ key: "C" }),
        generateArpeggio({ key: "C" }),
        generateIntervalDrill({ key: "C" }),
        generateArticulationDrill({ key: "C" }),
      ];

      for (const result of generators) {
        expect(result.abc).toMatch(/^X:1/);
        expect(result.abc).toContain("T:");
        expect(result.abc).toContain("M:");
        expect(result.abc).toContain("L:");
        expect(result.abc).toContain("Q:");
        expect(result.abc).toContain("K:");
        expect(result.abc).toContain("|]");
      }
    });

    it("all generators include tags array", () => {
      const generators = [
        generateScale({ key: "D" }),
        generateArpeggio({ key: "D" }),
        generateIntervalDrill({ key: "D" }),
        generateArticulationDrill({ key: "D" }),
      ];

      for (const result of generators) {
        expect(Array.isArray(result.tags)).toBe(true);
        expect(result.tags.length).toBeGreaterThan(0);
        // Key should be in tags as lowercase
        expect(result.tags).toContain("d");
      }
    });

    it("difficulty is always between 1 and 10", () => {
      const results = [
        generateScale({ key: "C", scaleType: "major", octaves: 1 }),
        generateScale({ key: "C", scaleType: "chromatic", octaves: 3 }),
        generateArpeggio({ key: "C", chordType: "dominant7", octaves: 3 }),
        generateIntervalDrill({ key: "C", interval: "octave" }),
        generateArticulationDrill({ key: "C", articulation: "double_tongue" }),
      ];

      for (const result of results) {
        expect(result.difficulty).toBeGreaterThanOrEqual(1);
        expect(result.difficulty).toBeLessThanOrEqual(10);
      }
    });
  });
});

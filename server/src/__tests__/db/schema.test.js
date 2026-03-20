import { describe, it, expect, vi } from "vitest";

// Undo global fs mock from setup.js so we can read the real schema file
vi.unmock("fs");

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "..", "..", "db", "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

describe("db/schema.sql", () => {
  it("is valid SQL (non-empty and parseable structure)", () => {
    expect(schema.length).toBeGreaterThan(100);
    // Should contain CREATE TABLE statements
    const createStatements = schema.match(
      /CREATE TABLE IF NOT EXISTS\s+(\w+)/g,
    );
    expect(createStatements).not.toBeNull();
    expect(createStatements.length).toBeGreaterThan(5);
  });

  describe("table definitions", () => {
    const expectedTables = [
      "settings",
      "users",
      "taxonomy_categories",
      "pieces",
      "sections",
      "technical_demands",
      "exercises",
      "demand_exercises",
      "excerpts",
      "uploaded_files",
      "practice_sessions",
      "session_blocks",
      "excerpt_rotation_log",
      "omr_results",
      "analysis_results",
      "analysis_demands",
      "resources",
      "audio_recordings",
      "audio_analyses",
      "assessments",
      "assessment_recordings",
      "follows",
      "challenges",
      "challenge_participants",
      "feed_events",
      "achievements",
      "community_themes",
      "theme_favorites",
      "excerpt_community_ratings",
      "excerpt_community_notes",
    ];

    for (const table of expectedTables) {
      it(`defines table "${table}"`, () => {
        const pattern = new RegExp(
          `CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`,
        );
        expect(schema).toMatch(pattern);
      });
    }
  });

  describe("foreign key relationships", () => {
    const expectedFKs = [
      {
        table: "sections",
        column: "piece_id",
        references: "pieces(id)",
        onDelete: "CASCADE",
      },
      {
        table: "technical_demands",
        column: "piece_id",
        references: "pieces(id)",
        onDelete: "CASCADE",
      },
      {
        table: "technical_demands",
        column: "category_id",
        references: "taxonomy_categories(id)",
        onDelete: "SET NULL",
      },
      {
        table: "demand_exercises",
        column: "demand_id",
        references: "technical_demands(id)",
        onDelete: "CASCADE",
      },
      {
        table: "demand_exercises",
        column: "exercise_id",
        references: "exercises(id)",
        onDelete: "CASCADE",
      },
      {
        table: "session_blocks",
        column: "session_id",
        references: "practice_sessions(id)",
        onDelete: "CASCADE",
      },
      {
        table: "excerpt_rotation_log",
        column: "excerpt_id",
        references: "excerpts(id)",
        onDelete: "CASCADE",
      },
      {
        table: "omr_results",
        column: "file_id",
        references: "uploaded_files(id)",
        onDelete: "CASCADE",
      },
      {
        table: "analysis_results",
        column: "file_id",
        references: "uploaded_files(id)",
        onDelete: "CASCADE",
      },
      {
        table: "follows",
        column: "follower_id",
        references: "users(id)",
        onDelete: "CASCADE",
      },
      {
        table: "follows",
        column: "following_id",
        references: "users(id)",
        onDelete: "CASCADE",
      },
      {
        table: "challenges",
        column: "creator_id",
        references: "users(id)",
        onDelete: "CASCADE",
      },
      {
        table: "challenge_participants",
        column: "challenge_id",
        references: "challenges(id)",
        onDelete: "CASCADE",
      },
      {
        table: "feed_events",
        column: "user_id",
        references: "users(id)",
        onDelete: "CASCADE",
      },
      {
        table: "achievements",
        column: "user_id",
        references: "users(id)",
        onDelete: "CASCADE",
      },
    ];

    for (const fk of expectedFKs) {
      it(`${fk.table}.${fk.column} -> ${fk.references} ON DELETE ${fk.onDelete}`, () => {
        const pattern = new RegExp(
          `${fk.column}\\s+TEXT\\s+(?:NOT NULL\\s+)?REFERENCES\\s+${fk.references.replace("(", "\\(").replace(")", "\\)")}\\s+ON DELETE ${fk.onDelete}`,
        );
        expect(schema).toMatch(pattern);
      });
    }
  });

  describe("CHECK constraints", () => {
    it("users.level has valid values", () => {
      expect(schema).toMatch(/level.*CHECK\s*\(\s*level\s+IN\s*\(\s*'student'/);
    });

    it("pieces.status has valid values", () => {
      expect(schema).toMatch(
        /status.*CHECK\s*\(\s*status\s+IN\s*\(\s*'not_started'/,
      );
    });

    it("pieces.difficulty is between 1 and 10", () => {
      expect(schema).toMatch(
        /difficulty\s+INTEGER\s+CHECK\s*\(\s*difficulty\s+BETWEEN\s+1\s+AND\s+10\s*\)/,
      );
    });

    it("exercises.source_type has valid values", () => {
      expect(schema).toMatch(
        /source_type.*CHECK\s*\(\s*source_type\s+IN\s*\(\s*'manual'/,
      );
    });

    it("uploaded_files.file_type has valid values", () => {
      expect(schema).toMatch(
        /file_type.*CHECK\s*\(\s*file_type\s+IN\s*\(\s*'sheet_music_digital'/,
      );
    });
  });

  describe("indexes", () => {
    const expectedIndexes = [
      "idx_users_email",
      "idx_taxonomy_parent",
      "idx_sections_piece",
      "idx_demands_piece",
      "idx_demands_category",
      "idx_exercises_category",
      "idx_session_blocks_session",
      "idx_rotation_date",
      "idx_rotation_excerpt",
      "idx_omr_file",
      "idx_analysis_file",
      "idx_resources_linked",
    ];

    for (const idx of expectedIndexes) {
      it(`creates index ${idx}`, () => {
        expect(schema).toContain(idx);
      });
    }
  });

  describe("primary keys", () => {
    it("settings has TEXT PRIMARY KEY", () => {
      expect(schema).toMatch(/settings\s*\(\s*key\s+TEXT\s+PRIMARY KEY/);
    });

    it("demand_exercises has composite primary key", () => {
      expect(schema).toMatch(
        /PRIMARY KEY\s*\(\s*demand_id\s*,\s*exercise_id\s*\)/,
      );
    });

    it("follows has composite primary key", () => {
      expect(schema).toMatch(
        /PRIMARY KEY\s*\(\s*follower_id\s*,\s*following_id\s*\)/,
      );
    });
  });
});

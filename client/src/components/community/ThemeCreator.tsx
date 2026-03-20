import { useState } from "react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { api } from "../../api/client";
import { X } from "lucide-react";
import { useModalLock } from "../../hooks/useModalLock";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TOKEN_FIELDS = [
  { key: "--pf-bg-primary", label: "Background" },
  { key: "--pf-accent-gold", label: "Gold accent" },
  { key: "--pf-accent-teal", label: "Teal accent" },
  { key: "--pf-accent-lavender", label: "Lavender accent" },
  { key: "--pf-text-primary", label: "Text" },
  { key: "--pf-accent-orange", label: "Orange accent" },
] as const;

const DEFAULT_COLOURS: Record<string, string> = {
  "--pf-bg-primary": "#faf9f7",
  "--pf-accent-gold": "#b08c2e",
  "--pf-accent-teal": "#2d9986",
  "--pf-accent-lavender": "#7b6ea8",
  "--pf-text-primary": "#1a1a2e",
  "--pf-accent-orange": "#c77a3c",
};

export function ThemeCreator({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [baseTheme, setBaseTheme] = useState("light");
  const [colours, setColours] = useState<Record<string, string>>({
    ...DEFAULT_COLOURS,
  });
  const [publishing, setPublishing] = useState(false);

  useModalLock(open);

  if (!open) return null;

  const handlePublish = async () => {
    if (!name.trim()) return;
    setPublishing(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api.createTheme({
        name: name.trim(),
        description: description.trim() || undefined,
        base_theme: baseTheme,
        tokens: colours,
        tags: tagList.length > 0 ? tagList : undefined,
      });
      onCreated();
    } catch {}
    setPublishing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Share a Theme</h2>
              <button
                onClick={onClose}
                className="text-[var(--pf-text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <Input
              label="Theme name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Autumn Warmth"
            />

            <Textarea
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your theme..."
            />

            <Input
              label="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. warm, dark, minimal"
            />

            {/* Base theme */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">
                Base theme
              </label>
              <div className="flex gap-3">
                {(["light", "dark", "midnight"] as const).map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="base-theme"
                      value={t}
                      checked={baseTheme === t}
                      onChange={() => setBaseTheme(t)}
                      className="accent-[var(--pf-accent-gold)]"
                    />
                    <span className="text-sm capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Colour pickers */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">
                Colours
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TOKEN_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colours[key]}
                      onChange={(e) =>
                        setColours((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer border border-[var(--pf-border-color)]"
                    />
                    <span className="text-xs text-[var(--pf-text-secondary)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">
                Preview
              </label>
              <div
                className="rounded-pf border border-[var(--pf-border-color)] p-4 space-y-2"
                style={{ backgroundColor: colours["--pf-bg-primary"] }}
              >
                <p
                  style={{
                    color: colours["--pf-text-primary"],
                    fontWeight: 600,
                  }}
                >
                  {name || "Theme Name"}
                </p>
                <p
                  style={{
                    color: colours["--pf-text-primary"],
                    fontSize: "0.875rem",
                    opacity: 0.7,
                  }}
                >
                  Sample body text for your theme preview.
                </p>
                <div className="flex gap-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: colours["--pf-accent-gold"] }}
                  >
                    Gold
                  </span>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: colours["--pf-accent-teal"] }}
                  >
                    Teal
                  </span>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: colours["--pf-accent-lavender"] }}
                  >
                    Lavender
                  </span>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: colours["--pf-accent-orange"] }}
                  >
                    Orange
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={!name.trim() || publishing}
              >
                {publishing ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

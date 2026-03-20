import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { api } from "../../api/client";
import { useTheme } from "../../themes/ThemeProvider";
import type { CommunityTheme } from "../../core/types";
import { Heart, Download, Palette, Loader } from "lucide-react";

const SWATCH_KEYS = [
  "--pf-bg-primary",
  "--pf-accent-gold",
  "--pf-accent-teal",
  "--pf-accent-lavender",
  "--pf-text-primary",
] as const;

export function ThemeGallery() {
  const { applyCustomTokens } = useTheme();
  const [themes, setThemes] = useState<CommunityTheme[]>([]);
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getThemeGallery(sort);
      setThemes(data as CommunityTheme[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [sort]);

  const handleApply = async (theme: CommunityTheme) => {
    try {
      await api.downloadTheme(theme.id);
      applyCustomTokens(theme.tokens);
    } catch {}
  };

  const handleFavorite = async (theme: CommunityTheme) => {
    try {
      await api.toggleThemeFavorite(theme.id);
      setThemes((prev) =>
        prev.map((t) =>
          t.id === theme.id
            ? {
                ...t,
                is_favorited: !t.is_favorited,
                favorites_count: t.is_favorited
                  ? t.favorites_count - 1
                  : t.favorites_count + 1,
              }
            : t,
        ),
      );
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          size={20}
          className="animate-spin text-[var(--pf-accent-gold)]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette size={16} style={{ color: "var(--pf-accent-lavender)" }} />
        <span className="text-sm font-semibold">Theme Gallery</span>
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant={sort === "popular" ? "primary" : "secondary"}
            onClick={() => setSort("popular")}
          >
            Popular
          </Button>
          <Button
            size="sm"
            variant={sort === "recent" ? "primary" : "secondary"}
            onClick={() => setSort("recent")}
          >
            Recent
          </Button>
        </div>
      </div>

      {themes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette
              size={32}
              className="mx-auto mb-3 text-[var(--pf-text-secondary)]"
            />
            <p className="text-sm text-[var(--pf-text-secondary)]">
              No community themes yet. Be the first to share one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <Card key={theme.id}>
              <CardContent className="space-y-3">
                {/* Colour swatches */}
                <div className="flex gap-2">
                  {SWATCH_KEYS.map((key) => (
                    <div
                      key={key}
                      className="w-6 h-6 rounded-full border border-[var(--pf-border-color)]"
                      style={{ backgroundColor: theme.tokens[key] || "#888" }}
                      title={key}
                    />
                  ))}
                </div>

                {/* Name + creator */}
                <div>
                  <p className="text-sm font-semibold">{theme.name}</p>
                  {theme.creator_name && (
                    <p className="text-xs text-[var(--pf-text-secondary)]">
                      by {theme.creator_name}
                    </p>
                  )}
                </div>

                {/* Stats + actions */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--pf-text-secondary)]">
                    <Heart size={12} /> {theme.favorites_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--pf-text-secondary)]">
                    <Download size={12} /> {theme.downloads_count}
                  </span>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApply(theme)}
                    >
                      Apply
                    </Button>
                    <button
                      onClick={() => handleFavorite(theme)}
                      className={`p-1.5 rounded-pf-sm transition-colors ${
                        theme.is_favorited
                          ? "text-[var(--pf-status-needs-work)]"
                          : "text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"
                      }`}
                      title={theme.is_favorited ? "Unfavourite" : "Favourite"}
                    >
                      <Heart
                        size={16}
                        fill={theme.is_favorited ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

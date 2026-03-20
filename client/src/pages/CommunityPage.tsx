import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { CreateChallengeModal } from "../components/community/CreateChallengeModal";
import type { Challenge, ChallengeType, FeedEvent } from "../core/types";
import {
  Users,
  Swords,
  Trophy,
  UserPlus,
  UserMinus,
  Clock,
  Search,
  Send,
  Award,
  Zap,
  Eye,
  Timer,
  Target,
  Calendar,
  Loader,
  Plus,
  Palette,
  Globe,
} from "lucide-react";
import { ThemeGallery } from "../components/community/ThemeGallery";

// ---------- constants ----------

type TabId = "feed" | "discover" | "challenges" | "people" | "themes";

const CHALLENGE_TYPE_CONFIG: Record<
  ChallengeType,
  { icon: typeof Swords; label: string }
> = {
  excerpt_duel: { icon: Swords, label: "Excerpt Duel" },
  scale_sprint: { icon: Zap, label: "Scale Sprint" },
  sight_reading: { icon: Eye, label: "Sight-Reading Race" },
  practice_marathon: { icon: Timer, label: "Practice Marathon" },
  technique_showdown: { icon: Target, label: "Technique Showdown" },
  weekly: { icon: Calendar, label: "Weekly Challenge" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--pf-text-secondary)",
  active: "var(--pf-accent-teal)",
  completed: "var(--pf-accent-gold)",
  expired: "var(--pf-text-secondary)",
  cancelled: "var(--pf-text-secondary)",
};

const PARTICIPANT_STATUS_COLORS: Record<string, string> = {
  invited: "var(--pf-text-secondary)",
  accepted: "var(--pf-accent-teal)",
  declined: "var(--pf-status-needs-work)",
  submitted: "var(--pf-accent-gold)",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function deadlineCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days}d left`;
}

function Avatar({ name }: { name: string }) {
  const letter = (name || "?")[0].toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--pf-accent-teal)]/20 text-[var(--pf-accent-teal)] flex items-center justify-center text-sm font-bold shrink-0">
      {letter}
    </div>
  );
}

// ---------- main page ----------

export function CommunityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("feed");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Feed state
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Discover state
  const [discover, setDiscover] = useState<FeedEvent[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Challenges state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  // People state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; display_name: string; instrument?: string; level?: string }[]
  >([]);
  const [following, setFollowing] = useState<
    { id: string; display_name: string; instrument?: string; level?: string }[]
  >([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Feed load
  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const data = await api.getFeed();
      setFeed(data as FeedEvent[]);
    } catch {}
    setFeedLoading(false);
  }, []);

  // Discover load
  const loadDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const data = await api.getDiscoverFeed();
      setDiscover(data as FeedEvent[]);
    } catch {}
    setDiscoverLoading(false);
  }, []);

  // Challenges load
  const loadChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const data = await api.getChallenges();
      setChallenges(data as Challenge[]);
    } catch {}
    setChallengesLoading(false);
  }, []);

  // People load
  const loadFollowing = useCallback(async () => {
    try {
      const data = await api.getFollowing();
      const typed = data as {
        id: string;
        display_name: string;
        instrument?: string;
        level?: string;
      }[];
      setFollowing(typed);
      setFollowingIds(new Set(typed.map((u) => u.id)));
    } catch {}
  }, []);

  useEffect(() => {
    if (tab === "feed") loadFeed();
    if (tab === "discover") loadDiscover();
    if (tab === "challenges") loadChallenges();
    if (tab === "people") loadFollowing();
  }, [tab, loadFeed, loadDiscover, loadChallenges, loadFollowing]);

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setPeopleLoading(true);
    try {
      const data = await api.searchUsers(searchQuery);
      setSearchResults(data as typeof searchResults);
    } catch {}
    setPeopleLoading(false);
  };

  const handleFollow = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.followUser(userId);
      setFollowingIds((prev) => new Set([...prev, userId]));
      loadFollowing();
    } catch {}
    setActionLoading(null);
  };

  const handleUnfollow = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.unfollowUser(userId);
      setFollowingIds((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
      loadFollowing();
    } catch {}
    setActionLoading(null);
  };

  const handleAcceptChallenge = async (id: string) => {
    setActionLoading(id);
    try {
      await api.acceptChallenge(id);
      loadChallenges();
    } catch {}
    setActionLoading(null);
  };

  const handleDeclineChallenge = async (id: string) => {
    setActionLoading(id);
    try {
      await api.declineChallenge(id);
      loadChallenges();
    } catch {}
    setActionLoading(null);
  };

  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: "feed", label: "Feed", icon: Send },
    { id: "discover", label: "Discover", icon: Globe },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "people", label: "People", icon: Users },
    { id: "themes", label: "Themes", icon: Palette },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Users size={24} style={{ color: "var(--pf-accent-teal)" }} />
        Community
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--pf-border-color)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-[var(--pf-accent-teal)] text-[var(--pf-accent-teal)]"
                  : "border-transparent text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Feed tab */}
      {tab === "feed" && (
        <div>
          {feedLoading ? (
            <div className="flex justify-center py-12">
              <Loader
                size={20}
                className="animate-spin text-[var(--pf-accent-gold)]"
              />
            </div>
          ) : feed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users
                  size={32}
                  className="mx-auto mb-3 text-[var(--pf-text-secondary)]"
                />
                <p className="text-sm text-[var(--pf-text-secondary)]">
                  Follow other musicians to see their activity here.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setTab("people")}
                >
                  Find People
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {feed.map((event) => (
                <Card key={event.id}>
                  <CardContent className="flex items-start gap-3">
                    <Avatar name={event.display_name || "U"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {event.display_name}
                        </span>
                        {event.instrument && (
                          <span className="text-xs text-[var(--pf-text-secondary)]">
                            {event.instrument}
                          </span>
                        )}
                        <span className="text-xs text-[var(--pf-text-secondary)] ml-auto">
                          {timeAgo(event.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-xs text-[var(--pf-text-secondary)] mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discover tab */}
      {tab === "discover" && (
        <div>
          {discoverLoading ? (
            <div className="flex justify-center py-12">
              <Loader
                size={20}
                className="animate-spin text-[var(--pf-accent-gold)]"
              />
            </div>
          ) : discover.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe
                  size={32}
                  className="mx-auto mb-3 text-[var(--pf-text-secondary)]"
                />
                <p className="text-sm text-[var(--pf-text-secondary)]">
                  No activity yet. Be the first to share something!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {discover.map((event) => (
                <Card key={event.id}>
                  <CardContent className="flex items-start gap-3">
                    <Avatar name={event.display_name || "U"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {event.display_name}
                        </span>
                        {event.instrument && (
                          <span className="text-xs text-[var(--pf-text-secondary)]">
                            {event.instrument}
                          </span>
                        )}
                        <span className="text-xs text-[var(--pf-text-secondary)] ml-auto">
                          {timeAgo(event.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-xs text-[var(--pf-text-secondary)] mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Challenges tab */}
      {tab === "challenges" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} />
              Create Challenge
            </Button>
          </div>

          {challengesLoading ? (
            <div className="flex justify-center py-12">
              <Loader
                size={20}
                className="animate-spin text-[var(--pf-accent-gold)]"
              />
            </div>
          ) : challenges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy
                  size={32}
                  className="mx-auto mb-3 text-[var(--pf-text-secondary)]"
                />
                <p className="text-sm text-[var(--pf-text-secondary)]">
                  No challenges yet. Create one to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => {
                const conf =
                  CHALLENGE_TYPE_CONFIG[c.type] || CHALLENGE_TYPE_CONFIG.weekly;
                const Icon = conf.icon;
                const myParticipation = c.participants?.find(
                  (p) => p.user_id === user?.id,
                );
                const isInvited = myParticipation?.status === "invited";
                const canSubmit =
                  c.status === "active" &&
                  myParticipation?.status === "accepted" &&
                  !myParticipation?.submitted_at;

                return (
                  <Card key={c.id}>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-pf-sm flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${STATUS_COLORS[c.status]}15`,
                          }}
                        >
                          <Icon
                            size={18}
                            style={{ color: STATUS_COLORS[c.status] }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">
                              {conf.label}
                            </span>
                            <Badge color={STATUS_COLORS[c.status]}>
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-[var(--pf-text-secondary)] mt-0.5 truncate">
                            {c.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--pf-text-secondary)] shrink-0">
                          <Clock size={12} />
                          {deadlineCountdown(c.deadline)}
                        </div>
                      </div>

                      {/* Participants */}
                      {c.participants && c.participants.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {c.participants.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1.5 text-xs"
                            >
                              <Avatar name={p.display_name || "U"} />
                              <span className="font-medium">
                                {p.display_name || "User"}
                              </span>
                              <Badge
                                color={PARTICIPANT_STATUS_COLORS[p.status]}
                              >
                                {p.status}
                              </Badge>
                              {p.score != null && (
                                <span className="font-mono font-bold text-[var(--pf-accent-gold)]">
                                  {p.score}pts
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {isInvited && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptChallenge(c.id)}
                              disabled={actionLoading === c.id}
                            >
                              {actionLoading === c.id ? (
                                <Loader size={14} className="animate-spin" />
                              ) : (
                                "Accept"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDeclineChallenge(c.id)}
                              disabled={actionLoading === c.id}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        {canSubmit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate("/record")}
                          >
                            Record Submission
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <CreateChallengeModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={loadChallenges}
          />
        </div>
      )}

      {/* People tab */}
      {tab === "people" && (
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search musicians..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleSearch}
                  disabled={peopleLoading || !searchQuery.trim()}
                >
                  {peopleLoading ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map((u) => {
                    const isFollowing = followingIds.has(u.id);
                    const isSelf = u.id === user?.id;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-2 rounded-pf-sm hover:bg-[var(--pf-bg-hover)] transition-colors"
                      >
                        <Avatar name={u.display_name} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {u.display_name}
                          </div>
                          <div className="text-xs text-[var(--pf-text-secondary)]">
                            {u.instrument}
                            {u.level
                              ? ` \u00b7 ${u.level.replace("_", " ")}`
                              : ""}
                          </div>
                        </div>
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant={isFollowing ? "secondary" : "primary"}
                            onClick={() =>
                              isFollowing
                                ? handleUnfollow(u.id)
                                : handleFollow(u.id)
                            }
                            disabled={actionLoading === u.id}
                          >
                            {actionLoading === u.id ? (
                              <Loader size={14} className="animate-spin" />
                            ) : isFollowing ? (
                              <>
                                <UserMinus size={14} /> Unfollow
                              </>
                            ) : (
                              <>
                                <UserPlus size={14} /> Follow
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Following */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Award size={16} style={{ color: "var(--pf-accent-gold)" }} />
                Following ({following.length})
              </h2>
            </CardHeader>
            <CardContent>
              {following.length === 0 ? (
                <p className="text-sm text-[var(--pf-text-secondary)] text-center py-6">
                  You are not following anyone yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {following.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-2 rounded-pf-sm hover:bg-[var(--pf-bg-hover)] transition-colors"
                    >
                      <Avatar name={u.display_name} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {u.display_name}
                        </div>
                        <div className="text-xs text-[var(--pf-text-secondary)]">
                          {u.instrument}
                          {u.level
                            ? ` \u00b7 ${u.level.replace("_", " ")}`
                            : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUnfollow(u.id)}
                        disabled={actionLoading === u.id}
                      >
                        {actionLoading === u.id ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <>
                            <UserMinus size={14} /> Unfollow
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Themes tab */}
      {tab === "themes" && <ThemeGallery />}
    </div>
  );
}

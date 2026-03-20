import { useState } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Textarea, Select } from "../components/ui/Input";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import type { UserLevel } from "../core/types";
import { User, Shield, Key, LogOut, CheckCircle, Award } from "lucide-react";
import { AchievementShelf } from "../components/community/AchievementShelf";

const LEVEL_LABELS: Record<string, string> = {
  student: "Student",
  advanced_student: "Advanced Student",
  pre_professional: "Pre-Professional",
  professional: "Professional",
};

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [instrument, setInstrument] = useState(user?.instrument || "Flute");
  const [level, setLevel] = useState<UserLevel>(user?.level || "student");
  const [institution, setInstitution] = useState(user?.institution || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        display_name: displayName,
        instrument,
        level,
        institution: institution || null,
        bio: bio || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess(false);
    try {
      await api.changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed");
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User size={18} /> Your Profile
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input label="Email" value={user.email} disabled />
            <Input
              label="Instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            />
            <Select
              label="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value as UserLevel)}
            >
              {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Input
              label="Institution (optional)"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Royal Academy of Music"
            />
            <Textarea
              label="Bio (optional)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  "Saving..."
                ) : saved ? (
                  <>
                    <CheckCircle size={14} /> Saved
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Key size={18} /> Change Password
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Current password"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
              <Input
                label="New password"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
              />
              {pwError && (
                <p
                  className="text-sm"
                  style={{ color: "var(--pf-status-needs-work)" }}
                >
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p
                  className="text-sm"
                  style={{ color: "var(--pf-status-ready)" }}
                >
                  Password changed successfully
                </p>
              )}
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={!currentPw || newPw.length < 8}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield size={18} /> Privacy
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  key: "profile_visible",
                  label: "Profile visible to community",
                },
                { key: "stats_visible", label: "Practice stats visible" },
                {
                  key: "recordings_shareable",
                  label: "Recordings shareable in challenges",
                },
                { key: "activity_visible", label: "Activity visible in feed" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      !!(
                        user.privacy_settings as unknown as Record<
                          string,
                          boolean
                        >
                      )?.[key]
                    }
                    onChange={(e) => {
                      const ps = {
                        ...user.privacy_settings,
                        [key]: e.target.checked,
                      };
                      updateUser({ privacy_settings: ps } as any);
                    }}
                    className="accent-[var(--pf-accent-gold)]"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
              <p className="text-xs text-[var(--pf-text-secondary)]">
                All options are off by default. You control what others see.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <Button
                variant="ghost"
                onClick={logout}
                className="text-[var(--pf-status-needs-work)]"
              >
                <LogOut size={16} /> Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award size={18} /> Achievements
              </h2>
            </CardHeader>
            <CardContent>
              <AchievementShelf />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

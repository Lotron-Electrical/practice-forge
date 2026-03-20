import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../auth/AuthContext";
import { LogIn, UserPlus, HelpCircle } from "lucide-react";

export function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();

  // Redirect to dashboard once authenticated
  if (isAuthenticated) return <Navigate to="/" replace />;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          display_name: displayName || undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--pf-bg-primary)] p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[var(--pf-text-primary)] font-heading font-bold text-3xl tracking-tight">
              PRACTICE
            </span>
            <span
              className="font-heading font-bold text-3xl tracking-tight"
              style={{ color: "var(--pf-accent-gold)" }}
            >
              FORGE
            </span>
          </div>
          <p className="text-sm text-[var(--pf-text-secondary)] mt-2">
            Shape your sound.
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--pf-text-secondary)", opacity: 0.5 }}
          >
            v0.20.Jolivet
          </p>
        </div>

        <Card>
          <CardContent>
            {/* Tab toggle */}
            <div className="flex mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  mode === "login"
                    ? "border-[var(--pf-accent-gold)] text-[var(--pf-text-primary)]"
                    : "border-transparent text-[var(--pf-text-secondary)]"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  mode === "register"
                    ? "border-[var(--pf-accent-gold)] text-[var(--pf-text-primary)]"
                    : "border-transparent text-[var(--pf-text-secondary)]"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <Input
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                />
              )}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 8 characters" : ""}
                required
              />

              {error && (
                <p
                  className="text-sm"
                  style={{ color: "var(--pf-status-needs-work)" }}
                >
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  "Please wait..."
                ) : mode === "login" ? (
                  <>
                    <LogIn size={16} /> Sign In
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Create Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        {/* Tutorial link */}
        <div className="text-center mt-4">
          <Link
            to="/tutorial"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-gold)] transition-colors"
          >
            <HelpCircle size={14} />
            New here? See how it works
          </Link>
        </div>
      </div>
    </div>
  );
}

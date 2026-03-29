import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import teamLogo from "@/assets/velocity-vortex-x-logo.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.endsWith("@gmail.com")) {
      toast.error("Only @gmail.com accounts are supported");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success("Account created! Please sign in.");
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        toast.success("Signed in successfully");
        navigate("/");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 border border-border bg-card/40 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4 border-b border-border pb-6">
          <img src={teamLogo} alt="Velocity Vortex X" className="h-16 w-16 rounded border border-border object-cover" />
          <div>
            <p className="text-xs tracking-[0.2em] text-muted-foreground">SECURE ACCESS</p>
            <h1 className="font-display text-2xl text-highlight">VELOCITY VORTEX X</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Gmail Account</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Only @gmail.com accounts are permitted</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button variant="hero" type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <Button type="button" variant="cathedral" className="w-full" onClick={() => navigate("/")} disabled={loading}>
            Continue as Guest
          </Button>
        </form>

        <div className="border-t border-border pt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

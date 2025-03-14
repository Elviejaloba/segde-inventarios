import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useSignInWithGoogle } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [signInWithGoogle] = useSignInWithGoogle(auth);
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-xl font-bold">Winter Sampling Tracker</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            {!auth.currentUser ? (
              <Button onClick={handleLogin} disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => auth.signOut()}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

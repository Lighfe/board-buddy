import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KanbanSquare } from "lucide-react";
import { signIn, signUp } from "@/api/mockClient";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in to Tack — kanban boards without the ceremony" },
      {
        name: "description",
        content:
          "Sign in or create a Tack account to organise work across Backlog, Today, Doing and Done.",
      },
      { property: "og:title", content: "Sign in to Tack" },
      {
        property: "og:description",
        content: "Kanban boards with columns, cards, archives, sharing and roles.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, refresh } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (session cookie restored) — go straight to the boards.
  useEffect(() => {
    if (user) void navigate({ to: "/boards" });
  }, [user, navigate]);

  const run = async (e: React.FormEvent, action: () => Promise<unknown>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await action();
      refresh();
      await navigate({ to: "/boards" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <KanbanSquare className="size-6" />
          </span>
          <h1 className="text-3xl font-bold">Tack</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A calm little board for the work that actually moves.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => void run(e, () => signIn({ email, password }))}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="si-email">Email</Label>
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-pass">Password</Label>
                  <Input
                    id="si-pass"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) =>
                  void run(e, () => signUp({ email: suEmail, name: suName, password: suPass }))
                }
              >
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Name</Label>
                  <Input
                    id="su-name"
                    required
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">Password</Label>
                  <Input
                    id="su-pass"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={suPass}
                    onChange={(e) => setSuPass(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          New accounts start with a Personal and a Work board.
        </p>

      </div>
    </main>
  );
}

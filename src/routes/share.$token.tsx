import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { redeemShareLink } from "@/api/mockClient";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Board invite — Tack" },
      { name: "description", content: "Redeem an invite link to join a shared Tack board." },
      { property: "og:title", content: "Board invite — Tack" },
      { property: "og:description", content: "Redeem an invite link to join a shared Tack board." },
    ],
  }),
  component: RedeemPage,
});

function RedeemPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { refresh } = useApp();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Checking your invite…");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    redeemShareLink(token)
      .then((res) => {
        setStatus("ok");
        setMessage(
          res.changed
            ? `You joined “${res.boardName}” as ${res.role}.`
            : `You already had ${res.role} access to “${res.boardName}”, so nothing changed.`,
        );
        refresh();
        setTimeout(() => void navigate({ to: "/boards/$boardId", params: { boardId: res.boardId } }), 1200);
      })
      .catch((e: unknown) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "This invite link can't be used.");
      });
  }, [token, navigate, refresh]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        {status === "error" ? (
          <TriangleAlert className="mx-auto size-8 text-destructive" />
        ) : (
          <CheckCircle2
            className={status === "ok" ? "mx-auto size-8 text-done" : "mx-auto size-8 text-muted-foreground"}
          />
        )}
        <h1 className="mt-4 text-xl font-bold">
          {status === "error" ? "Invite not valid" : status === "ok" ? "You're in" : "One moment"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link to="/boards" className="mt-6 inline-block text-sm font-semibold text-primary">
          Go to your boards
        </Link>
      </div>
    </main>
  );
}

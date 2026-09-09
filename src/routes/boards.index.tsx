import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KanbanSquare, Plus } from "lucide-react";
import { createBoard, listBoards } from "@/api/mockClient";
import { useApi, useApp, useMutate } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/boards/")({
  head: () => ({
    meta: [
      { title: "Your boards — Tack" },
      { name: "description", content: "Every Tack board you own or have been invited to." },
      { property: "og:title", content: "Your boards — Tack" },
      { property: "og:description", content: "Switch between the boards you own or share." },
    ],
  }),
  component: BoardsPage,
});

function BoardsPage() {
  const { user } = useApp();
  const mutate = useMutate();
  const navigate = useNavigate();
  const { data: boards, loading } = useApi(() => listBoards(), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-xs font-semibold uppercase tracking-widest text-primary">
            Tack
          </Link>
          <h1 className="mt-1 text-3xl font-bold">Your boards</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user?.name ?? "…"} · {boards?.length ?? 0} board
            {boards?.length === 1 ? "" : "s"}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New board
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Create a board</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Board name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              New boards start with Backlog, Today, Doing and Done.
            </p>
            <DialogFooter>
              <Button
                disabled={!name.trim()}
                onClick={async () => {
                  const board = await mutate(() => createBoard(name), "Board created");
                  setName("");
                  setOpen(false);
                  if (board) void navigate({ to: "/boards/$boardId", params: { boardId: board.id } });
                }}
              >
                Create board
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading boards…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards?.map((b) => (
          <Link
            key={b.id}
            to="/boards/$boardId"
            params={{ boardId: b.id }}
            className="group rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <KanbanSquare className="size-4" />
              </span>
              <Badge variant={b.role === "owner" ? "default" : "secondary"} className="capitalize">
                {b.role}
              </Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold group-hover:text-primary">{b.name}</h2>
            <p className="text-xs text-muted-foreground">Owned by {b.ownerName}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

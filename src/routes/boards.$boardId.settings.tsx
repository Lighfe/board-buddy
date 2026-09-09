import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createShareLink,
  deleteBoard,
  getBoard,
  listMembers,
  listShareLinks,
  removeMember,
  renameBoard,
  transferOwnership,
  updateMemberRole,
  type ShareRole,
} from "@/api/mockClient";
import { useApi, useApp, useMutate } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/boards/$boardId/settings")({
  head: () => ({
    meta: [
      { title: "Board settings — Tack" },
      { name: "description", content: "Rename or delete a board, manage members, invite links and ownership." },
      { property: "og:title", content: "Board settings — Tack" },
      { property: "og:description", content: "Manage members, invite links and ownership for your board." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { boardId } = Route.useParams();
  const { user } = useApp();
  const mutate = useMutate();
  const navigate = useNavigate();

  const { data: board } = useApi(() => getBoard(boardId), [boardId]);
  const { data: members } = useApi(() => listMembers(boardId), [boardId]);
  const { data: links } = useApi(
    () => (board?.role === "owner" ? listShareLinks(boardId) : Promise.resolve([])),
    [boardId, board?.role],
  );

  const [name, setName] = useState("");
  const [transferTo, setTransferTo] = useState("");

  useEffect(() => {
    if (board) setName(board.board.name);
  }, [board]);

  if (!board) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  if (board.role !== "owner") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Owner only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Board settings are available to the board owner. You're currently {board.role}.
        </p>
      </main>
    );
  }

  const others = (members ?? []).filter((m) => m.userId !== user?.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10">
      <section>
        <h1 className="text-2xl font-bold">Board settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only you, the owner, can change these.</p>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Name</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input className="max-w-sm" value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            disabled={!name.trim() || name === board.board.name}
            onClick={() => void mutate(() => renameBoard(boardId, name), "Board renamed")}
          >
            Save name
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="mt-4 divide-y">
          {members?.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {m.user.name}
                  {m.userId === user?.id && " (you)"}
                </p>
                <p className="text-xs text-muted-foreground">{m.user.email}</p>
              </div>

              {m.role === "owner" ? (
                <Badge>Owner</Badge>
              ) : (
                <>
                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      void mutate(
                        () => updateMemberRole(boardId, m.userId, v as ShareRole),
                        "Role updated",
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${m.user.name}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {m.user.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          They lose access immediately. Every active invite link for this board is
                          revoked at the same time, so old links can't be reused.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            void mutate(() => removeMember(boardId, m.userId), "Member removed")
                          }
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </li>
          ))}
        </ul>

        <Separator className="my-5" />

        <h3 className="text-sm font-semibold">Transfer ownership</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The chosen member becomes owner and you become an editor. You can't leave the board
          without transferring or deleting it first.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={transferTo} onValueChange={setTransferTo}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={others.length ? "Choose a member" : "No other members"} />
            </SelectTrigger>
            <SelectContent>
              {others.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" disabled={!transferTo}>
                Transfer ownership
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hand over this board?</AlertDialogTitle>
                <AlertDialogDescription>
                  They become the owner and you drop to editor. Only the new owner can undo this.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    void mutate(() => transferOwnership(boardId, transferTo), "Ownership transferred")
                  }
                >
                  Transfer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Invite links</h2>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => void mutate(() => createShareLink(boardId, "viewer"), "View link created")}
          >
            <Link2 className="size-4" /> New view link
          </Button>
          <Button
            variant="secondary"
            onClick={() => void mutate(() => createShareLink(boardId, "editor"), "Edit link created")}
          >
            <Link2 className="size-4" /> New edit link
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {links?.length === 0 && (
            <li className="text-sm text-muted-foreground">No links yet.</li>
          )}
          {links?.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
              <Badge variant={l.role === "editor" ? "default" : "secondary"} className="capitalize">
                {l.role}
              </Badge>
              <code className="rounded bg-muted px-2 py-1 text-xs">/share/{l.token}</code>
              {l.revoked && <Badge variant="outline">Revoked</Badge>}
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy link"
                  onClick={() => {
                    void navigator.clipboard?.writeText(`${window.location.origin}/share/${l.token}`);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                {!l.revoked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void mutate(() => revoke(boardId, l.id), "Link revoked")}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-destructive/40 bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold text-destructive">Delete board</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting “{board.board.name}” removes every column, card, archived card, member and
          invite link on it. This can't be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              Delete this board
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{board.board.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                All columns, cards (including archived ones), members and invite links go with it.
                There is no way back.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await mutate(() => deleteBoard(boardId), "Board deleted");
                  void navigate({ to: "/boards" });
                }}
              >
                Delete board
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}

async function revoke(boardId: string, linkId: string) {
  const { revokeShareLink } = await import("@/api/mockClient");
  return revokeShareLink(boardId, linkId);
}

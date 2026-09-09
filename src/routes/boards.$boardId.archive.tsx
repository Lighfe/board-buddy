import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import {
  deleteTaskPermanently,
  getBoard,
  listArchivedTasks,
  type Task,
} from "@/api/mockClient";
import { useApi, useMutate } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TaskEditorDialog } from "@/components/kanban/TaskEditorDialog";
import { formatDue, priorityTextClass } from "@/lib/kanban-utils";

export const Route = createFileRoute("/boards/$boardId/archive")({
  head: () => ({
    meta: [
      { title: "Archived cards — Tack" },
      { name: "description", content: "Cards archived from this board, with permanent delete." },
      { property: "og:title", content: "Archived cards — Tack" },
      { property: "og:description", content: "Review archived cards from your Tack board." },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { boardId } = Route.useParams();
  const mutate = useMutate();
  const { data: board } = useApi(() => getBoard(boardId), [boardId]);
  const { data: tasks, loading } = useApi(() => listArchivedTasks(boardId), [boardId]);
  const canDelete = board ? board.role === "owner" : false;
  const [openTask, setOpenTask] = useState<(Task & { columnName: string }) | null>(null);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Archive</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Archived cards stay off the board for good. Open one to read its details. Only the board
        owner can delete a card forever, and that can't be undone.
      </p>

      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {tasks?.length === 0 && (
        <p className="mt-10 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing archived yet.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {tasks?.map((t) => (
          <li
            key={t.id}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-lift"
          >
            <button
              type="button"
              className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpenTask(t)}
            >
              <p className="font-medium">{t.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{t.columnName}</Badge>
                <span className={priorityTextClass[t.priority]}>{t.priority}</span>
                {t.dueDate && <span>Due {formatDue(t.dueDate)}</span>}
              </div>
              {t.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
              )}
            </button>

            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete permanently"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{t.title}” forever?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This card will be gone permanently. There is no restore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        void mutate(() => deleteTaskPermanently(boardId, t.id), "Card deleted")
                      }
                    >
                      Delete forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </li>
        ))}
      </ul>

      <TaskEditorDialog
        task={openTask}
        columnName={openTask?.columnName ?? ""}
        canEdit={false}
        archived
        open={openTask !== null}
        onOpenChange={(o) => !o && setOpenTask(null)}
        onSave={async () => {}}
        onArchive={async () => {}}
      />
    </main>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  archiveAllInDone,
  archiveTask,
  createColumn,
  createTask,
  deleteColumn,
  getBoard,
  moveTask,
  renameColumn,
  reorderColumn,
  updateTask,
  type Task,
} from "@/api/mockClient";
import { useApi, useMutate } from "@/lib/app-state";
import { ColumnView } from "@/components/kanban/ColumnView";
import { TaskEditorDialog } from "@/components/kanban/TaskEditorDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isDoneColumn } from "@/lib/kanban-utils";

export const Route = createFileRoute("/boards/$boardId/")({
  head: () => ({
    meta: [
      { title: "Board — Tack" },
      { name: "description", content: "Drag cards across Backlog, Today, Doing and Done." },
      { property: "og:title", content: "Board — Tack" },
      { property: "og:description", content: "Drag cards across Backlog, Today, Doing and Done." },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const mutate = useMutate();
  const { data, loading } = useApi(() => getBoard(boardId), [boardId]);

  const [dragging, setDragging] = useState<string | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [columnDropIndex, setColumnDropIndex] = useState<number | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnName, setColumnName] = useState("");

  if (loading && !data) return <p className="p-8 text-sm text-muted-foreground">Loading board…</p>;
  if (!data) return null;

  const canEdit = data.role !== "viewer";
  const active = data.tasks.filter((t) => !t.archived);
  const tasksIn = (columnId: string) =>
    active.filter((t) => t.columnId === columnId).sort((a, b) => a.order - b.order);
  const openTaskColumn = openTask
    ? (data.columns.find((c) => c.id === openTask.columnId)?.name ?? "Deleted column")
    : "";

  const handleDrop = async (toColumnId: string, index: number) => {
    const taskId = dragging;
    setDragging(null);
    if (!taskId) return;
    const task = active.find((t) => t.id === taskId);
    if (!task) return;
    let target = index;
    if (task.columnId === toColumnId) {
      const from = tasksIn(toColumnId).findIndex((t) => t.id === taskId);
      if (from > -1 && from < index) target = index - 1;
    }
    await mutate(() => moveTask(boardId, taskId, toColumnId, target));
  };

  const doneIndex = data.columns.findIndex((c) => isDoneColumn(c.name));
  const maxColumnIndex = doneIndex === -1 ? data.columns.length : doneIndex;
  const columnDragActive = draggingColumn !== null && canEdit;

  const handleColumnDrop = async (index: number) => {
    const columnId = draggingColumn;
    setDraggingColumn(null);
    setColumnDropIndex(null);
    if (!columnId) return;
    const from = data.columns.findIndex((c) => c.id === columnId);
    let target = Math.min(index, maxColumnIndex);
    if (from > -1 && from < target) target -= 1;
    if (from === target) return;
    await mutate(() => reorderColumn(boardId, columnId, target), "Column moved");
  };

  const columnDropZone = (index: number) => (
    <div
      onDragOver={(e) => {
        if (!columnDragActive || index > maxColumnIndex) return;
        e.preventDefault();
        setColumnDropIndex(index);
      }}
      onDragLeave={() => setColumnDropIndex((i) => (i === index ? null : i))}
      onDrop={(e) => {
        if (!columnDragActive || index > maxColumnIndex) return;
        e.preventDefault();
        void handleColumnDrop(index);
      }}
      className={cn(
        "self-stretch rounded-full transition-all",
        columnDragActive && index <= maxColumnIndex ? "w-3" : "w-0",
        columnDropIndex === index && columnDragActive && index <= maxColumnIndex
          ? "w-8 bg-primary/15 ring-1 ring-primary/40"
          : "",
      )}
    />
  );

  return (
    <main className="flex-1 overflow-x-auto px-4 py-6 scrollbar-slim">
      <div className="flex items-start gap-4">
        {data.columns.map((column, ci) => (
          <div key={column.id} className="flex items-stretch">
            {columnDropZone(ci)}
            <ColumnView
              column={column}
              tasks={tasksIn(column.id)}
              canEdit={canEdit}
              draggingTaskId={dragging}
              draggingColumnId={draggingColumn}
              onDragTask={setDragging}
              onDragColumn={setDraggingColumn}
              onDropTask={(cid, i) => void handleDrop(cid, i)}
              onCreateTask={async (title) => {
                await mutate(() => createTask(boardId, column.id, { title }));
              }}
              onRename={async (name) => {
                await mutate(() => renameColumn(boardId, column.id, name), "Column renamed");
              }}
              onDelete={async () => {
                const res = await mutate(() => deleteColumn(boardId, column.id));
                if (res) {
                  const n = res.archivedCount;
                  toast.success(
                    n > 0
                      ? `Column deleted · ${n} card${n === 1 ? "" : "s"} archived`
                      : "Column deleted",
                  );
                }
              }}
              onArchiveAll={async () => {
                const res = await mutate(() => archiveAllInDone(boardId));
                if (res) {
                  toast.success(
                    `${res.archivedCount} card${res.archivedCount === 1 ? "" : "s"} archived`,
                  );
                }
              }}
              onOpenTask={setOpenTask}
              onArchiveTask={(task) =>
                void mutate(() => archiveTask(boardId, task.id), "Card archived")
              }
            />
            {ci === data.columns.length - 1 &&
              doneIndex === -1 &&
              columnDropZone(data.columns.length)}
          </div>
        ))}

        {canEdit && (
          <div className="w-[19rem] shrink-0">
            {addingColumn ? (
              <div className="space-y-2 rounded-2xl border border-dashed p-3">
                <Input
                  autoFocus
                  placeholder="Column name"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && columnName.trim()) {
                      await mutate(() => createColumn(boardId, columnName), "Column added");
                      setColumnName("");
                      setAddingColumn(false);
                    }
                    if (e.key === "Escape") setAddingColumn(false);
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!columnName.trim()}
                    onClick={async () => {
                      await mutate(() => createColumn(boardId, columnName), "Column added");
                      setColumnName("");
                      setAddingColumn(false);
                    }}
                  >
                    Add column
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start rounded-2xl border border-dashed py-6 text-muted-foreground"
                onClick={() => setAddingColumn(true)}
              >
                <Plus className="size-4" /> New column
              </Button>
            )}
          </div>
        )}
      </div>

      <TaskEditorDialog
        task={openTask}
        columnName={openTaskColumn}
        canEdit={canEdit}
        open={openTask !== null}
        onOpenChange={(o) => !o && setOpenTask(null)}
        onSave={async (patch) => {
          if (!openTask) return;
          await mutate(() => updateTask(boardId, openTask.id, patch), "Card saved");
        }}
        onArchive={async () => {
          if (!openTask) return;
          await mutate(() => archiveTask(boardId, openTask.id), "Card archived");
        }}
      />
    </main>
  );
}

import { useState } from "react";
import { Check, GripVertical, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import type { Column, Task } from "@/api/mockClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isDoneColumn } from "@/lib/kanban-utils";
import { TaskCard } from "./TaskCard";

interface Props {
  column: Column;
  tasks: Task[];
  canEdit: boolean;
  draggingTaskId: string | null;
  draggingColumnId: string | null;
  onDragTask: (taskId: string | null) => void;
  onDropTask: (columnId: string, index: number) => void;
  onDragColumn: (columnId: string | null) => void;
  onCreateTask: (title: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onArchiveAll: () => Promise<void>;
  onOpenTask: (task: Task) => void;
  onArchiveTask: (task: Task) => void;
}

export function ColumnView({
  column,
  tasks,
  canEdit,
  draggingTaskId,
  draggingColumnId,
  onDragTask,
  onDropTask,
  onDragColumn,
  onCreateTask,
  onRename,
  onDelete,
  onArchiveAll,
  onOpenTask,
  onArchiveTask,
}: Props) {
  const done = isDoneColumn(column.name);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(column.name);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState(false);

  const dragActive = draggingTaskId !== null && canEdit;
  const columnDraggable = canEdit && !done && !renaming;

  const dropZone = (index: number) => (
    <div
      onDragOver={(e) => {
        if (!dragActive) return;
        e.preventDefault();
        e.stopPropagation();
        setDropIndex(index);
        setOverColumn(true);
      }}
      onDrop={(e) => {
        if (!dragActive) return;
        e.preventDefault();
        e.stopPropagation();
        setDropIndex(null);
        setOverColumn(false);
        onDropTask(column.id, index);
      }}
      className={cn(
        "rounded-full transition-all",
        dragActive ? "h-3" : "h-1",
        dropIndex === index && dragActive ? "h-8 bg-primary/15 ring-1 ring-primary/40" : "",
      )}
    />
  );


  return (
    <section
      className={cn(
        "flex w-[19rem] shrink-0 flex-col rounded-2xl border bg-surface/80 p-3 backdrop-blur transition-all",
        draggingColumnId === column.id && "opacity-40",
        dragActive && overColumn && "border-primary/50 bg-primary/5",
      )}
      aria-label={`${column.name} column`}
      onDragOver={(e) => {
        if (!dragActive) return;
        e.preventDefault();
        setDropIndex(null);
        setOverColumn(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setOverColumn(false);
        setDropIndex(null);
      }}
      onDrop={(e) => {
        if (!dragActive) return;
        e.preventDefault();
        const index = dropIndex ?? tasks.length;
        setDropIndex(null);
        setOverColumn(false);
        onDropTask(column.id, index);
      }}
    >

      <header
        className={cn("mb-2 flex items-center gap-2", columnDraggable && "cursor-grab active:cursor-grabbing")}
        draggable={columnDraggable}
        onDragStart={(e) => {
          if (!columnDraggable) return;
          e.dataTransfer.effectAllowed = "move";
          onDragColumn(column.id);
        }}
        onDragEnd={() => onDragColumn(null)}
      >
        {renaming ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await onRename(nameDraft);
                  setRenaming(false);
                }
                if (e.key === "Escape") setRenaming(false);
              }}
              className="h-8"
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={async () => {
                await onRename(nameDraft);
                setRenaming(false);
              }}
            >
              <Check className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setRenaming(false)}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            {columnDraggable && (
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <h2
              className={cn(
                "flex-1 truncate text-sm font-semibold uppercase tracking-wide",
                done ? "text-done" : "text-surface-foreground",
              )}
            >
              {column.name}
            </h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {tasks.length}
            </span>
            {canEdit && !done && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-7" aria-label="Column options">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setNameDraft(column.name);
                      setRenaming(true);
                    }}
                  >
                    Rename column
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4" /> Delete column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </header>

      {done && canEdit && tasks.length > 0 && (
        <Button variant="secondary" size="sm" className="mb-2" onClick={() => void onArchiveAll()}>
          Archive all in Done
        </Button>
      )}

      <div className="flex min-h-[16.5rem] flex-1 flex-col scrollbar-slim">
        {dropZone(0)}
        {tasks.map((task, i) => (
          <div key={task.id}>
            <TaskCard
              task={task}
              columnName={column.name}
              canEdit={canEdit}
              dragging={draggingTaskId === task.id}
              onDragStart={() => onDragTask(task.id)}
              onDragEnd={() => onDragTask(null)}
              onOpen={() => onOpenTask(task)}
              onArchive={() => onArchiveTask(task)}
            />
            {dropZone(i + 1)}
          </div>
        ))}
        {tasks.length === 0 && !dragActive && (
          <p className="px-1 py-4 text-xs text-muted-foreground">No cards yet.</p>
        )}
      </div>

      {canEdit &&
        (adding ? (
          <div className="mt-2 space-y-2">
            <Input
              autoFocus
              placeholder="Card title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  await onCreateTask(newTitle);
                  setNewTitle("");
                }
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newTitle.trim()}
                onClick={async () => {
                  await onCreateTask(newTitle);
                  setNewTitle("");
                  setAdding(false);
                }}
              >
                Add card
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 justify-start text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" /> Add card
          </Button>
        ))}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{column.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {tasks.length > 0
                ? `${tasks.length} card${tasks.length === 1 ? "" : "s"} in this column will be archived. Archived cards can't be put back on the board.`
                : "This column is empty and will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()}>Delete column</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

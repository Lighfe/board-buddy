import { Archive, CalendarDays } from "lucide-react";
import type { Task } from "@/api/mockClient";
import { cn } from "@/lib/utils";
import { formatDue, isOverdue, priorityDotClass } from "@/lib/kanban-utils";

interface Props {
  task: Task;
  columnName: string;
  canEdit: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}

export function TaskCard({
  task,
  columnName,
  canEdit,
  onOpen,
  onArchive,
  onDragStart,
  onDragEnd,
  dragging,
}: Props) {
  const overdue = isOverdue(task, columnName);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group relative rounded-xl border bg-card p-3 text-left shadow-card transition-all",
        "hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        overdue && "border-overdue/50 bg-overdue-surface",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          aria-label={`${task.priority} priority`}
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", priorityDotClass[task.priority])}
        />
        <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
        {canEdit && (
          <button
            type="button"
            aria-label="Archive card"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Archive className="size-3.5" />
          </button>
        )}
      </div>

      {(task.dueDate || task.description) && (
        <div className="mt-2 flex items-center gap-3 pl-4 text-xs text-muted-foreground">
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                overdue && "bg-overdue text-overdue-foreground font-semibold",
              )}
            >
              <CalendarDays className="size-3" />
              {formatDue(task.dueDate)}
              {overdue && " · overdue"}
            </span>
          )}
          {task.description && <span className="truncate">{task.description}</span>}
        </div>
      )}
    </div>
  );
}

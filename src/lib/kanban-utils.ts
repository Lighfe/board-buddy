import type { Priority, Task } from "@/api/mockClient";

export const isDoneColumn = (name: string) => name.trim().toLowerCase() === "done";

/** Date-only comparison: overdue when today is after the due date. */
export function isOverdue(task: Task, columnName: string): boolean {
  if (!task.dueDate || task.archived || isDoneColumn(columnName)) return false;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return todayKey > task.dueDate;
}

export function formatDue(dueDate: string): string {
  const [y, m, d] = dueDate.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const priorityDotClass: Record<Priority, string> = {
  High: "bg-priority-high",
  Medium: "bg-priority-medium",
  Low: "bg-priority-low",
};

export const priorityTextClass: Record<Priority, string> = {
  High: "text-priority-high",
  Medium: "text-priority-medium",
  Low: "text-priority-low",
};

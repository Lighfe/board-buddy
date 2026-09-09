import { useEffect, useState } from "react";
import type { Priority, Task } from "@/api/mockClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

interface Props {
  task: Task | null;
  columnName: string;
  canEdit: boolean;
  archived?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: {
    title: string;
    description: string;
    dueDate: string | null;
    priority: Priority;
  }) => Promise<void>;
  onArchive: () => Promise<void>;
}

export function TaskEditorDialog({
  task,
  columnName,
  canEdit,
  archived = false,
  open,
  onOpenChange,
  onSave,
  onArchive,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate ?? "");
    setPriority(task.priority);
  }, [task]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{canEdit ? "Edit card" : "Card details"}</DialogTitle>
          <DialogDescription>
            In {columnName}
            {!canEdit && " · you have view-only access, so this card is read-only."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              rows={4}
              value={description}
              disabled={!canEdit}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                disabled={!canEdit}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                disabled={!canEdit}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {canEdit ? (
            <>
              <Button
                variant="ghost"
                onClick={async () => {
                  await onArchive();
                  onOpenChange(false);
                }}
              >
                Archive card
              </Button>
              <Button
                disabled={saving || !title.trim()}
                onClick={async () => {
                  setSaving(true);
                  await onSave({
                    title,
                    description,
                    dueDate: dueDate || null,
                    priority,
                  });
                  setSaving(false);
                  onOpenChange(false);
                }}
              >
                Save changes
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

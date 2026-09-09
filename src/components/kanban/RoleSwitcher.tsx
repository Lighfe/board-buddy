import { Eye } from "lucide-react";
import type { Role } from "@/api/mockClient";
import { getSimulatedRole, setSimulatedRole } from "@/api/mockClient";
import { useApp } from "@/lib/app-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES: Role[] = ["owner", "editor", "viewer"];
const LABEL: Record<Role, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };

/**
 * Dev-only control: overrides the effective role for permission checks on the
 * current board. It never changes anyone's real membership.
 */
export function RoleSwitcher({ boardId, actualRole }: { boardId: string; actualRole: Role }) {
  const { refresh } = useApp();
  const current = getSimulatedRole(boardId) ?? actualRole;

  return (
    <div className="flex items-center gap-2 rounded-full border border-dashed bg-card px-3 py-1.5">
      <Eye className="size-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Viewing as</span>
      <Select
        value={current}
        onValueChange={(v) => {
          setSimulatedRole(boardId, v === actualRole ? null : (v as Role));
          refresh();
        }}
      >
        <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs font-semibold shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {LABEL[r]}
              {r === actualRole ? " (actual)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

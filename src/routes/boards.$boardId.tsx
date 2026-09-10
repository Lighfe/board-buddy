import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getBoard } from "@/api/mockClient";
import { useApi } from "@/lib/app-state";
import { colorValue, useBoardColorId } from "@/lib/board-color";


import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/boards/$boardId")({
  component: BoardLayout,
});

const tabClass =
  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

function BoardLayout() {
  const { boardId } = Route.useParams();
  const { data, error, loading } = useApi(() => getBoard(boardId), [boardId]);
  const background = colorValue(useBoardColorId(boardId));


  if (loading && !data) {
    return <p className="p-8 text-sm text-muted-foreground">Loading board…</p>;
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Board unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "This board doesn't exist."}</p>
        <Link to="/boards" className="mt-6 inline-block text-sm font-semibold text-primary">
          Back to your boards
        </Link>
      </main>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={background ? { background } : undefined}
    >
      <header className="border-b bg-card/70 backdrop-blur">

        <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            to="/boards"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Boards
          </Link>
          <h1 className="text-lg font-bold">{data.board.name}</h1>
          <Badge variant="secondary" className="capitalize">
            {data.role}
          </Badge>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              to="/boards/$boardId"
              params={{ boardId }}
              activeOptions={{ exact: true }}
              activeProps={{ className: cn(tabClass, "bg-secondary text-foreground") }}
              inactiveProps={{ className: tabClass }}
            >
              Board
            </Link>
            <Link
              to="/boards/$boardId/archive"
              params={{ boardId }}
              activeProps={{ className: cn(tabClass, "bg-secondary text-foreground") }}
              inactiveProps={{ className: tabClass }}
            >
              Archive
            </Link>
            {data.role === "owner" && (
              <Link
                to="/boards/$boardId/settings"
                params={{ boardId }}
                activeProps={{ className: cn(tabClass, "bg-secondary text-foreground") }}
                inactiveProps={{ className: tabClass }}
              >
                Settings
              </Link>
            )}
          </nav>
        </div>
      </header>


      <Outlet />
    </div>
  );
}

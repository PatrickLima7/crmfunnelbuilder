import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface BlockingAlertModalProps {
  alert: { message: string; action: string; onResolve: () => void } | null;
}

export function BlockingAlertModal({ alert }: BlockingAlertModalProps) {
  if (!alert) return null;

  return (
    <AlertDialog open={!!alert} onOpenChange={() => {/* prevent closing */}}>
      <AlertDialogContent
        className="border-destructive/50 bg-background"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Ação necessária
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {alert.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={alert.onResolve}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {alert.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar ação",
  description = "Tem certeza que deseja realizar esta ação? Ela não pode ser desfeita.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {variant !== "default" && (
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                variant === "danger" ? "bg-red-100" : "bg-amber-100"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  variant === "danger" ? "text-red-600" : "text-amber-600"
                }`} />
              </div>
            )}
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : variant === "warning" ? "warning" : "default"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    resolve?: (value: boolean) => void;
    options?: Partial<ConfirmDialogProps>;
  }>({ open: false });

  const confirm = (options?: Partial<ConfirmDialogProps>): Promise<boolean> =>
    new Promise((resolve) => {
      setState({ open: true, resolve, options });
    });

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ open: false });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState({ open: false });
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      {...state.options}
      open={state.open}
      onOpenChange={(open) => !open && handleCancel()}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmDialogComponent };
}

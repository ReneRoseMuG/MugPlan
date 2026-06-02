import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  TriangleAlert,
} from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  normalizeServerError,
  type NormalizedServerError,
  type NormalizedServerErrorSeverity,
} from "@/lib/error-normalization";
import { cn } from "@/lib/utils";

export type DialogBaseSize = "sm" | "md" | "lg" | "xl";
export type DialogBaseTone = "info" | "success" | "warning" | "error";
export type DialogBaseStepState = "pending" | "active" | "complete" | "error";

export interface DialogBaseAction {
  disabled?: boolean;
  isPending?: boolean;
  label: string;
  onClick?: () => void;
  pendingLabel?: string;
  testId?: string;
  type?: "button" | "submit";
  variant?: ButtonProps["variant"];
}

export interface DialogBaseStep {
  id: string;
  state: DialogBaseStepState;
  title: string;
}

interface DialogBaseShellProps {
  children: React.ReactNode;
  closeDisabled?: boolean;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  headerContent?: React.ReactNode;
  headerMeta?: React.ReactNode;
  icon?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  size?: DialogBaseSize;
  testId?: string;
  title: React.ReactNode;
}

interface DialogBaseFooterProps {
  backAction?: DialogBaseAction;
  className?: string;
  primaryAction?: DialogBaseAction;
  secondaryAction?: DialogBaseAction;
}

interface DialogBaseInlineMessageProps {
  className?: string;
  description?: React.ReactNode;
  error?: NormalizedServerError | unknown;
  title?: React.ReactNode;
  tone?: DialogBaseTone;
}

interface DialogBaseStepperProps {
  className?: string;
  steps: DialogBaseStep[];
}

interface ConfirmDialogBaseProps {
  cancelLabel?: string;
  closeDisabled?: boolean;
  confirmLabel: string;
  description?: React.ReactNode;
  disabled?: boolean;
  icon: React.ReactNode;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pendingLabel?: string;
  testId?: string;
  title: React.ReactNode;
  variant?: "default" | "destructive";
}

interface MutationPreviewDialogBaseProps {
  children: React.ReactNode;
  closeDisabled?: boolean;
  description?: React.ReactNode;
  error?: NormalizedServerError | unknown;
  footer: React.ReactNode;
  headerContent?: React.ReactNode;
  info?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  size?: DialogBaseSize;
  steps?: DialogBaseStep[];
  summary?: React.ReactNode;
  testId?: string;
  title: React.ReactNode;
}

const sizeClasses: Record<DialogBaseSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

const severityToneMap: Record<NormalizedServerErrorSeverity, DialogBaseTone> = {
  error: "error",
  info: "info",
  warning: "warning",
};

const toneStyles: Record<
  DialogBaseTone,
  { alertVariant?: "destructive"; icon: React.ElementType; iconClassName: string }
> = {
  info: {
    icon: Info,
    iconClassName: "text-primary",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: "text-amber-600",
  },
  error: {
    alertVariant: "destructive",
    icon: AlertCircle,
    iconClassName: "text-destructive",
  },
};

const stepStyles: Record<DialogBaseStepState, string> = {
  active: "border-primary bg-primary text-primary-foreground",
  complete: "border-emerald-600 bg-emerald-600 text-white",
  error: "border-destructive bg-destructive text-destructive-foreground",
  pending: "border-muted-foreground/40 bg-background text-muted-foreground",
};

const dialogIconFrameClassName =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-700 shadow-sm [&_svg]:h-5 [&_svg]:w-5 [&_svg]:!text-slate-700";

const dialogHeaderGridClassName =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-end gap-3 text-center";

export function DialogBaseShell({
  children,
  closeDisabled = false,
  description,
  footer,
  headerContent,
  headerMeta,
  icon,
  onOpenChange,
  open,
  size = "md",
  testId,
  title,
}: DialogBaseShellProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => handleOpenChange(nextOpen)}>
      <DialogContent
        className={cn(
          "max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0",
          sizeClasses[size],
        )}
        data-testid={testId}
        onEscapeKeyDown={(event) => {
          if (closeDisabled) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (closeDisabled) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b bg-slate-50 px-6 py-4">
          <div className={dialogHeaderGridClassName}>
            {icon ? (
              <div className={dialogIconFrameClassName}>
                {icon}
              </div>
            ) : (
              <div aria-hidden="true" className="h-11 w-11" />
            )}
            <div className="min-w-0 self-end space-y-1">
              {headerMeta ? (
                <div className="text-xs font-medium text-muted-foreground">
                  {headerMeta}
                </div>
              ) : null}
              <DialogTitle className="leading-snug text-slate-950">{title}</DialogTitle>
              {headerContent ? (
                <div className="pt-1">{headerContent}</div>
              ) : null}
            </div>
            <div aria-hidden="true" className="h-11 w-11" />
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {description ? (
            <DialogDescription className="mb-4 text-base leading-relaxed text-slate-700">
              {description}
            </DialogDescription>
          ) : null}
          {children}
        </div>

        {footer ? <div className="border-t bg-slate-50 px-6 py-4">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );

  function handleOpenChange(nextOpen: boolean) {
    if (closeDisabled && !nextOpen) {
      return;
    }

    onOpenChange(nextOpen);
  }
}

export function DialogBaseFooter({
  backAction,
  className,
  primaryAction,
  secondaryAction,
}: DialogBaseFooterProps) {
  return (
    <DialogFooter
      className={cn(
        "gap-2 sm:items-center",
        backAction ? "sm:justify-between" : "sm:justify-end",
        className,
      )}
    >
      {backAction ? (
        <Button
          className="mr-auto"
          data-testid={backAction.testId}
          disabled={backAction.disabled || backAction.isPending}
          onClick={backAction.onClick}
          type={backAction.type ?? "button"}
          variant={backAction.variant ?? "ghost"}
        >
          {backAction.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ArrowLeft />
          )}
          {backAction.isPending
            ? backAction.pendingLabel ?? backAction.label
            : backAction.label}
        </Button>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {secondaryAction ? (
          <Button
            data-testid={secondaryAction.testId}
            disabled={secondaryAction.disabled || secondaryAction.isPending}
            onClick={secondaryAction.onClick}
            type={secondaryAction.type ?? "button"}
            variant={secondaryAction.variant ?? "outline"}
          >
            {secondaryAction.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            {secondaryAction.isPending
              ? secondaryAction.pendingLabel ?? secondaryAction.label
              : secondaryAction.label}
          </Button>
        ) : null}

        {primaryAction ? (
          <Button
            data-testid={primaryAction.testId}
            disabled={primaryAction.disabled || primaryAction.isPending}
            onClick={primaryAction.onClick}
            type={primaryAction.type ?? "button"}
            variant={primaryAction.variant ?? "default"}
          >
            {primaryAction.isPending ? <Loader2 className="animate-spin" /> : null}
            {primaryAction.isPending
              ? primaryAction.pendingLabel ?? primaryAction.label
              : primaryAction.label}
          </Button>
        ) : null}
      </div>
    </DialogFooter>
  );
}

export function DialogBaseInlineMessage({
  className,
  description,
  error,
  title,
  tone,
}: DialogBaseInlineMessageProps) {
  const normalized =
    error instanceof Object && isNormalizedServerError(error)
      ? error
      : error
        ? normalizeServerError(error)
        : null;
  const resolvedTone =
    tone ?? (normalized ? severityToneMap[normalized.severity] : "info");
  const toneStyle = toneStyles[resolvedTone];
  const Icon = toneStyle.icon;

  return (
    <Alert
      className={cn("text-left", className)}
      variant={toneStyle.alertVariant}
    >
      <Icon className={cn("h-4 w-4", toneStyle.iconClassName)} />
      <AlertTitle>{title ?? normalized?.title}</AlertTitle>
      <AlertDescription>
        {description ?? normalized?.description}
      </AlertDescription>
    </Alert>
  );
}

export function DialogBaseStepper({
  className,
  steps,
}: DialogBaseStepperProps) {
  return (
    <ol
      className={cn(
        "grid gap-2 text-sm sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]",
        className,
      )}
    >
      {steps.map((step, index) => {
        const isCurrent = step.state === "active";
        const Icon = step.state === "complete" ? CheckCircle2 : Circle;

        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/40 px-3 py-2"
            key={step.id}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold",
                stepStyles[step.state],
              )}
            >
              {step.state === "pending" ? (
                index + 1
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="min-w-0 truncate">{step.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ConfirmDialogBase({
  cancelLabel = "Abbrechen",
  closeDisabled = false,
  confirmLabel,
  description,
  disabled = false,
  icon,
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  pendingLabel,
  testId,
  title,
  variant = "default",
}: ConfirmDialogBaseProps) {
  const effectiveCloseDisabled = closeDisabled || isPending;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (effectiveCloseDisabled && !nextOpen) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        data-testid={testId}
      >
        <AlertDialogHeader className="border-b bg-slate-50 px-6 py-4">
          <div className={dialogHeaderGridClassName}>
            <div className={dialogIconFrameClassName}>
              {icon}
            </div>
            <AlertDialogTitle className="min-w-0 self-end leading-snug text-slate-950">
              {title}
            </AlertDialogTitle>
            <div aria-hidden="true" className="h-11 w-11" />
          </div>
        </AlertDialogHeader>

        <div className="px-6 py-5">
          {description ? (
            <AlertDialogDescription className="text-base leading-relaxed text-foreground">
              {description}
            </AlertDialogDescription>
          ) : null}
        </div>

        <AlertDialogFooter className="border-t bg-slate-50 px-6 py-4">
          <AlertDialogCancel disabled={effectiveCloseDisabled}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              variant === "destructive" &&
                "border border-destructive-border bg-destructive text-destructive-foreground",
            )}
            disabled={disabled || isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isPending ? pendingLabel ?? confirmLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MutationPreviewDialogBase({
  children,
  closeDisabled,
  description,
  error,
  footer,
  headerContent,
  info,
  onOpenChange,
  open,
  size,
  steps,
  summary,
  testId,
  title,
}: MutationPreviewDialogBaseProps) {
  return (
    <DialogBaseShell
      closeDisabled={closeDisabled}
      description={description}
      footer={footer}
      headerContent={headerContent}
      onOpenChange={onOpenChange}
      open={open}
      size={size}
      testId={testId}
      title={title}
    >
      <div className="space-y-4">
        {steps?.length ? <DialogBaseStepper steps={steps} /> : null}
        {info ? <DialogBaseInlineMessage tone="info" title={info} /> : null}
        {error ? <DialogBaseInlineMessage error={error} /> : null}
        {summary ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">{summary}</div>
        ) : null}
        {children}
      </div>
    </DialogBaseShell>
  );
}

function isNormalizedServerError(
  value: object,
): value is NormalizedServerError {
  return "isKnownCode" in value && "title" in value && "description" in value;
}

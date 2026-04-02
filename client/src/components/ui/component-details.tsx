import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ComponentDetailsDraft = {
  name: string;
  shortCode: string;
  description: string;
  isActive: boolean;
};

interface ComponentDetailsProps {
  draft: ComponentDetailsDraft;
  disabled: boolean;
  isAdmin: boolean;
  hideIsActive?: boolean;
  error?: string | null;
  onDraftChange: (draft: ComponentDetailsDraft) => void;
  onSubmit?: () => void;
  submitLabel?: string;
}

export function ComponentDetails({
  draft,
  disabled,
  isAdmin,
  hideIsActive = false,
  error,
  onDraftChange,
  onSubmit,
  submitLabel,
}: ComponentDetailsProps) {
  const showIsActive = isAdmin && !hideIsActive;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_110px] md:items-end" data-testid="component-details-primary-row">
        <div className="space-y-2">
          <Label htmlFor="component-details-name">Name</Label>
          <Input
            id="component-details-name"
            value={draft.name}
            disabled={disabled}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            placeholder="Name eingeben"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="component-details-short-code">ShortCode</Label>
          <Input
            id="component-details-short-code"
            value={draft.shortCode}
            disabled={disabled}
            maxLength={10}
            onChange={(event) => onDraftChange({ ...draft, shortCode: event.target.value.slice(0, 10) })}
            placeholder="Kurzcode"
          />
        </div>

        {showIsActive ? (
          <div className="space-y-2">
            <Label htmlFor="component-details-active">Status</Label>
            <label className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
              <input
                id="component-details-active"
                type="checkbox"
                checked={draft.isActive}
                disabled={disabled}
                onChange={(event) => onDraftChange({ ...draft, isActive: event.target.checked })}
              />
              <span>Aktiv</span>
            </label>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="component-details-description">Beschreibung</Label>
        <Textarea
          id="component-details-description"
          value={draft.description}
          disabled={disabled}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          rows={2}
          className="min-h-0"
          placeholder="Beschreibung eingeben"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {onSubmit ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onSubmit}
            disabled={disabled || !draft.name.trim()}
          >
            {submitLabel ?? "Aktualisieren"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

import { ComponentProps } from "react";
import { FilterInput } from "@/components/ui/filter-input";

type SearchFilterInputProps = Omit<ComponentProps<typeof FilterInput>, "placeholder">;

export function SearchFilterInput({
  label,
  placeholderLabel,
  labelAdornment,
  ...props
}: SearchFilterInputProps & { placeholderLabel?: string }) {
  const resolvedPlaceholder = `Suche: ${placeholderLabel ?? label}`;

  return (
    <FilterInput
      label={label}
      labelAdornment={labelAdornment}
      {...props}
      placeholder={resolvedPlaceholder}
    />
  );
}

import { ComponentProps } from "react";
import { FilterInput } from "@/components/ui/filter-input";

type SearchFilterInputProps = Omit<ComponentProps<typeof FilterInput>, "placeholder">;

export function SearchFilterInput({
  label,
  placeholderLabel: _placeholderLabel,
  labelAdornment,
  ...props
}: SearchFilterInputProps & { placeholderLabel?: string }) {
  return (
    <FilterInput
      label={label}
      labelAdornment={labelAdornment}
      {...props}
      placeholder=""
    />
  );
}

import { ComponentProps } from "react";
import { FilterInput } from "@/components/ui/filter-input";

type SearchFilterInputProps = Omit<ComponentProps<typeof FilterInput>, "placeholder">;

export function SearchFilterInput({
  label,
  ...props
}: SearchFilterInputProps) {
  const resolvedPlaceholder = `Suche: ${label}`;

  return (
    <FilterInput
      label={label}
      {...props}
      placeholder={resolvedPlaceholder}
    />
  );
}

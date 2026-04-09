export function stripHtmlToText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatEmployeeShortName(fullName: string): string {
  if (!fullName) return "";
  const commaIndex = fullName.indexOf(",");
  if (commaIndex === -1) return fullName;
  const lastName = fullName.slice(0, commaIndex).trim();
  const firstName = fullName.slice(commaIndex + 1).trim();
  if (!firstName) return lastName;
  return `${firstName} ${lastName.charAt(0)}.`;
}

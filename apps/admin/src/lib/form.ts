export function stringField(form: FormData, name: string, fallback = ""): string {
  const value = form.get(name);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

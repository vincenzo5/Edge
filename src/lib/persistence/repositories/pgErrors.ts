import "server-only";

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export function isIntegerOutOfRange(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as { code: string }).code === "22003") return true;
  }
  return error instanceof Error && error.message.includes("integer out of range");
}

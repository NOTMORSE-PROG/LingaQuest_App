// Central source of truth for shared server-side constants.
// Import from here — do NOT hardcode these values in route handlers.

export const ISLAND_PASS_THRESHOLD = 80;

export const SERVER_ERRORS = {
  INTERNAL: "Server error. Please try again.",
  INVALID_BODY: "Invalid request body.",
  NOT_FOUND: (entity: string) => `${entity} not found.`,
  UNAUTHORIZED: "Unauthorized.",
  FORBIDDEN: "Access denied.",
} as const;

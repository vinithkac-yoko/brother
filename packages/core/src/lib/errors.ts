export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

// A deterministic invariant from CLAUDE.md mission-critical rule 3 was
// violated (e.g. advance not confirmed, powder coat color not set). These
// must never be bypassable by the agent, only ever raised by services.
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

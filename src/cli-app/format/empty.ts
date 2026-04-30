export function formatEmpty(noun: string, context?: string): string {
  return context ? `No ${noun} ${context}.` : `No ${noun}.`;
}


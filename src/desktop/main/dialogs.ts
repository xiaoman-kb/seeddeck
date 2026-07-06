export interface DialogSelectionResult {
  canceled: boolean;
  filePaths: string[];
}

export function selectedDialogPath(result: DialogSelectionResult): string | null {
  if (result.canceled) return null;
  return result.filePaths[0] || null;
}
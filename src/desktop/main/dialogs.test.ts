import { describe, expect, it } from "vitest";
import { selectedDialogPath } from "./dialogs";

describe("selectedDialogPath", () => {
  it("returns null when a native dialog is canceled", () => {
    expect(selectedDialogPath({ canceled: true, filePaths: ["C:/tmp/file.torrent"] })).toBeNull();
  });

  it("returns null when no file is selected", () => {
    expect(selectedDialogPath({ canceled: false, filePaths: [] })).toBeNull();
  });

  it("returns the selected file path", () => {
    expect(selectedDialogPath({ canceled: false, filePaths: ["C:/tmp/file.torrent"] })).toBe("C:/tmp/file.torrent");
  });
});
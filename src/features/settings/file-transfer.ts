import { exportConfigAsJson } from "@/core/config";
import type { PowerButtonsConfig } from "@/shared/types";

type UrlApi = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function buildExportConfigFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());
  const seconds = padDatePart(date.getSeconds());

  return `siyuan-power-buttons-config-${year}${month}${day}-${hours}${minutes}${seconds}.json`;
}

export function exportConfigFile(
  config: PowerButtonsConfig,
  ownerDocument: Document = document,
  urlApi: UrlApi = URL,
): void {
  const serialized = exportConfigAsJson(config);
  const blob = new Blob([serialized], { type: "application/json;charset=utf-8" });
  const url = urlApi.createObjectURL(blob);
  const link = ownerDocument.createElement("a");
  link.href = url;
  link.download = buildExportConfigFilename();
  link.click();
  urlApi.revokeObjectURL(url);
}

export function openImportFilePicker(input: HTMLInputElement | null): void {
  input?.click();
}

export async function readConfigFile(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("读取配置文件失败。"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file, "utf-8");
  });
}

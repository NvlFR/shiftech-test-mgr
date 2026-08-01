export interface RunnerRelease {
  version: string;
  filename: string;
  url: string;
  sha256: string;
  checksumFilename: string;
  checksumUrl: string;
  size: number;
  generatedAt: string;
  minimumNodeVersion: string;
}

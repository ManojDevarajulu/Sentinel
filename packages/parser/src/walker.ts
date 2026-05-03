import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

export async function walkRepo(repoPath: string): Promise<string[]> {
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/coverage/**',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.tsx',
    '**/*.spec.tsx'
  ];

  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: repoPath,
    ignore: ignorePatterns,
    absolute: true
  });

  // Filter out tiny files (< 10 bytes) or empty files
  const validFiles = files.filter(file => {
    try {
      const stats = fs.statSync(file);
      return stats.size >= 10;
    } catch {
      return false;
    }
  });

  return validFiles.sort();
}

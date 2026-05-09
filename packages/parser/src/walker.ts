import fs from 'fs';
import path from 'path';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '__tests__',
]);

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export async function walkRepo(repoPath: string): Promise<string[]> {
  const root = path.resolve(repoPath);
  const files: string[] = [];

  walkDirectory(root, files);

  return files
    .filter((file) => {
      const normalized = file.replace(/\\/g, '/');
      if (normalized.endsWith('.d.ts')) return false;
      if (normalized.endsWith('.test.ts') || normalized.endsWith('.spec.ts')) return false;
      if (normalized.endsWith('.test.tsx') || normalized.endsWith('.spec.tsx')) return false;

      try {
        return fs.statSync(file).size >= 10;
      } catch {
        return false;
      }
    })
    .sort();
}

function walkDirectory(directory: string, files: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        walkDirectory(fullPath, files);
      }
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.resolve(fullPath));
    }
  }
}

import path from 'path';
import fs from 'fs';

export function resolveImport(importStr: string, fromFile: string, repoRoot: string): string | null {
  // Ignore external npm packages
  if (!importStr.startsWith('.') && !importStr.startsWith('@/')) {
    return null;
  }

  let basePath = '';
  
  if (importStr.startsWith('@/')) {
    // Attempt to resolve alias
    const relativeAlias = importStr.substring(2);
    basePath = path.join(repoRoot, 'src', relativeAlias);
    if (!fs.existsSync(basePath) && !fs.existsSync(basePath + '.ts') && !fs.existsSync(basePath + '.tsx')) {
      // Fallback if no src directory
      basePath = path.join(repoRoot, relativeAlias);
    }
  } else {
    // Relative import
    basePath = path.join(path.dirname(fromFile), importStr);
  }

  const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '.jsx'];
  
  for (const ext of extensions) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  return null;
}

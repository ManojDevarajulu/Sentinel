import path from 'path';
import { NodeType } from './types.js';

export function classifyNode(filePath: string, fileContent: string): NodeType {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Path Rules
  if (normalizedPath.endsWith('middleware.ts') || normalizedPath.endsWith('middleware.tsx')) {
    return NodeType.MIDDLEWARE;
  }
  if (normalizedPath.match(/\/app\/.*\/page\.tsx?$/)) {
    return NodeType.PAGE;
  }
  if (normalizedPath.match(/\/app\/.*\/layout\.tsx?$/)) {
    return NodeType.LAYOUT;
  }
  if (normalizedPath.match(/\/app\/api\/.*\/route\.tsx?$/)) {
    return NodeType.API_ROUTE;
  }
  
  const filename = path.basename(normalizedPath);
  if (normalizedPath.match(/\/hooks?\/use[A-Z]/) || (filename.startsWith('use') && filename.endsWith('.ts'))) {
    return NodeType.HOOK;
  }

  // Content Rules
  if (fileContent.includes('@supabase/supabase-js') || fileContent.includes('createClient(')) {
    return NodeType.SUPABASE_CLIENT;
  }
  
  if (filename.endsWith('.tsx') && fileContent.includes('export default function')) {
    return NodeType.COMPONENT;
  }
  
  if (filename.endsWith('.ts') && !fileContent.includes('from "react"') && !fileContent.includes("from 'react'")) {
    return NodeType.UTIL;
  }

  return NodeType.UTIL;
}

export function computeDisplayName(filePath: string, repoRoot: string): string {
  const relPath = path.relative(repoRoot, filePath);
  const ext = path.extname(relPath);
  const base = path.basename(relPath, ext);
  return base;
}

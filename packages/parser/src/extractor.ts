import { parse } from '@typescript-eslint/typescript-estree';

export function parseFile(filePath: string, fileContent: string): string[] {
  const imports: string[] = [];

  try {
    const ast = parse(fileContent, {
      jsx: true,
      tolerant: true,
      range: false,
      loc: false
    });

    function visitNode(node: any) {
      if (!node) return;

      // Static import
      if (node.type === 'ImportDeclaration') {
        if (node.source && typeof node.source.value === 'string') {
          imports.push(node.source.value);
        }
      }
      
      // Export from (e.g. export * from './a')
      if (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') {
        if (node.source && typeof node.source.value === 'string') {
          imports.push(node.source.value);
        }
      }

      // Dynamic import or require
      if (node.type === 'CallExpression') {
        if (
          node.callee.type === 'Import' || 
          (node.callee.type === 'Identifier' && node.callee.name === 'require')
        ) {
          if (node.arguments && node.arguments[0] && typeof node.arguments[0].value === 'string') {
            imports.push(node.arguments[0].value);
          }
        }
      }

      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          visitNode(node[key]);
        }
      }
    }

    visitNode(ast);
    return imports;

  } catch (err: any) {
    console.warn(`[parser] skipping ${filePath}: ${err.message}`);
    return [];
  }
}

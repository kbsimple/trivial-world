// Source rule for ALL non-test files in packages/api/src: no `Buffer`, no direct
// `process` references, no node: imports. apps/mobile's tsc compiles this source
// through the function imports without @types/node. Environment access goes only
// through readEnv() below.

export function readEnv(name: string): string | undefined {
  return (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env?.[name];
}

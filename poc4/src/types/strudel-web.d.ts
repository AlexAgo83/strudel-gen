declare module '@strudel/web' {
  export function initStrudel(opts?: unknown): Promise<unknown>
  export function evaluate(
    code: string,
    autoStart?: boolean,
  ): Promise<unknown | undefined>
  export function hush(): void
  export function samples(source: string): Promise<unknown>
}

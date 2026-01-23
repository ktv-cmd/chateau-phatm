const isDev = process.env.NODE_ENV !== 'production'

type LogArgs = Parameters<typeof console.log>

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...args)
  },
  info: (...args: LogArgs) => {
    if (isDev) console.info(...args)
  },
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: LogArgs) => {
    if (isDev) console.error(...args)
  }
}

export const logger = {
  info: (msg: string, extra?: any) => console.log(JSON.stringify({ level: "info", msg, ...extra })),
  warn: (msg: string, extra?: any) => console.warn(JSON.stringify({ level: "warn", msg, ...extra })),
  error: (msg: string, extra?: any) => console.error(JSON.stringify({ level: "error", msg, ...extra })),
};

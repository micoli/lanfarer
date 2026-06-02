export function log(msg: string): void {
  if (!process.env.CLI_MODE) process.stderr.write(msg + "\n");
}

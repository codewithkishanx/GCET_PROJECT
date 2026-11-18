import { spawn } from "node:child_process";

const services = [
  { name: "backend", cmd: "npm", args: ["run", "dev", "-w", "@dsa/backend"] },
  { name: "worker", cmd: "npm", args: ["run", "dev", "-w", "@dsa/worker"] },
];

const children = [];

for (const { name, cmd, args } of services) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true });
  children.push(child);
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
}

function shutdown() {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

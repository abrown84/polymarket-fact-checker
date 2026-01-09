import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runMcpListTools({ label, command, args }) {
  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  const rl = createInterface({ input: child.stdout });
  const pending = new Map();
  let closed = false;

  function send(msg) {
    child.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  rl.on("line", (line) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }
    if (parsed && typeof parsed.id !== "undefined" && pending.has(parsed.id)) {
      pending.get(parsed.id).resolve(parsed);
      pending.delete(parsed.id);
    }
  });

  child.on("exit", (code) => {
    closed = true;
    for (const { reject } of pending.values()) {
      reject(new Error(`${label} exited early with code ${code}`));
    }
    pending.clear();
  });

  function request(id, method, params) {
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      send({ jsonrpc: "2.0", id, method, params });
    });
  }

  // Give the process a moment to boot.
  await sleep(150);
  if (closed) throw new Error(`${label} failed to start`);

  // MCP handshake
  await request(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mcp-smoke-test", version: "0.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const toolsResp = await request(2, "tools/list", {});
  const tools = toolsResp?.result?.tools ?? [];

  child.kill();
  return tools.map((t) => t?.name).filter(Boolean);
}

async function main() {
  const results = [];

  // Node MCP server (public)
  results.push({
    label: "polymarket (node)",
    tools: await runMcpListTools({
      label: "polymarket (node)",
      command: "node",
      args: ["mcp-server/dist/index.js"],
    }),
  });

  // Python MCP server (authenticated)
  results.push({
    label: "polymarket_python (python)",
    tools: await runMcpListTools({
      label: "polymarket_python (python)",
      command: "mcp-server-python/.venv/Scripts/python.exe",
      args: ["mcp-server-python/server.py"],
    }),
  });

  for (const r of results) {
    console.log(`\n=== ${r.label} ===`);
    console.log(r.tools.length ? r.tools.join(", ") : "(no tools returned)");
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


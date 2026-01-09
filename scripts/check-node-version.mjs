const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

if (!Number.isFinite(major) || major < 18) {
  // Keep this message very explicit: it’s the fastest path to unblocking.
  console.error(
    [
      "",
      "❌ Node.js 18+ is required to run this project (Convex CLI needs global fetch).",
      `   Detected: v${process.versions.node}`,
      "",
      "✅ Fix (recommended): install Node.js LTS (20.x) from https://nodejs.org and restart your terminal.",
      "   Then run:",
      "     npm install",
      "     npm run dev",
      "",
    ].join("\n"),
  );
  process.exit(1);
}


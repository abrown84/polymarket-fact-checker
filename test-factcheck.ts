/**
 * Test script for factCheck action
 * Run with: npx convex run actions/factCheck:factCheck --args '{"question": "Will the Fed cut rates by March 2026?"}'
 */

// This is a test query to verify the factCheck action works
const testQueries = [
  "Will the Fed cut rates by March 2026?",
  "Will Bitcoin reach $100k by 2025?",
  "Will there be a recession in 2024?",
];

console.log("Test queries ready:");
testQueries.forEach((q, i) => {
  console.log(`${i + 1}. ${q}`);
});

console.log("\nTo test, run:");
console.log('npx convex run actions/factCheck:factCheck --args \'{"question": "Will the Fed cut rates by March 2026?"}\'');




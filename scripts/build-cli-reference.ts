import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLI_MANIFEST } from "../src/cli-app/manifest-data.js";

const lines = [
  "# CLI reference",
  "",
  "Generated from `src/cli-app/manifest-data.ts`. Regenerate with `npm run cli-reference`.",
  "",
  "## Commands",
  "",
  "| Command | Tier | Summary | Output schema |",
  "| --- | --- | --- | --- |"
];

for (const command of CLI_MANIFEST.commands) {
  lines.push(
    `| \`${command.path.join(" ")}\` | \`${command.tier}\` | ${command.summary} | \`${command.stdout.schemaRef}\` |`
  );
}

lines.push("", "## Environment", "");
for (const env of CLI_MANIFEST.envVars) {
  lines.push(`- \`${env.name}\`: ${env.summary}`);
}

lines.push("", "## Error Codes", "");
for (const error of CLI_MANIFEST.errorCodes) {
  lines.push(`- \`${error.code}\` (exit ${error.exitCode}): ${error.hint}`);
}

writeFileSync(join(process.cwd(), "docs/cli-reference.md"), `${lines.join("\n")}\n`);


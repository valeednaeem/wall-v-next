import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";
const AGENTS_DIR = "C:/xampp/htdocs/agency/agency-agents";

interface DivisionMeta {
  label: string;
  icon: string;
  color: string;
}

async function updateDivisions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Agent = (await import("@/models/agent")).default as any;

    // Load divisions metadata
    const divisionsJson = JSON.parse(
      fs.readFileSync(path.join(AGENTS_DIR, "divisions.json"), "utf-8")
    );
    const divisions = divisionsJson.divisions as Record<string, DivisionMeta>;

    console.log(`\nFound ${Object.keys(divisions).length} divisions\n`);

    // Get all agents
    const agents = await Agent.find({}).lean();
    console.log(`Found ${agents.length} agents\n`);

    let updated = 0;
    let skipped = 0;

    for (const agent of agents) {
      // Extract division from slug (format: agency-{division}-{name})
      const slug = agent.slug as string;
      const parts = slug.replace("agency-", "").split("-");
      
      // Try to match division from the start of the slug
      let matchedDivision: string | null = null;
      const divisionKeys = Object.keys(divisions);

      for (const div of divisionKeys) {
        const divParts = div.split("-");
        const slugParts = parts.slice(0, divParts.length);
        if (slugParts.join("-") === div) {
          matchedDivision = div;
          break;
        }
      }

      if (!matchedDivision) {
        skipped++;
        continue;
      }

      const divMeta = divisions[matchedDivision];

      // Update agent with division metadata
      await Agent.updateOne(
        { _id: agent._id },
        {
          $set: {
            division: matchedDivision,
            divisionLabel: divMeta.label,
            divisionIcon: divMeta.icon,
            divisionColor: divMeta.color,
          },
        }
      );

      updated++;
      if (updated % 50 === 0) {
        console.log(`  Progress: ${updated} updated, ${skipped} skipped`);
      }
    }

    console.log(`\nUpdate complete:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);

    process.exit(0);
  } catch (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
}

updateDivisions();

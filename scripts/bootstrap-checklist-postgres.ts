import { bootstrapChecklistPostgres } from "../server/checklistStorage";

const importFirebase = !process.argv.includes("--definitions-only");

bootstrapChecklistPostgres({ importFirebase })
  .then(() => {
    console.log(importFirebase
      ? "Bootstrap checklist PostgreSQL completado con importación desde Firebase."
      : "Bootstrap checklist PostgreSQL completado solo con definiciones.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error bootstrap checklist PostgreSQL:", error);
    process.exit(1);
  });

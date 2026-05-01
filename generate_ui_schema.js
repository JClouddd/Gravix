const admin = require("firebase-admin");

// Initialize Firebase Admin (assuming default credentials or emulator)
// If you need specific credentials, configure them here.
// For the sake of this script, we'll output the JSON schema directly so we can inspect it.

const schema = {
  type: "grid",
  columns: "1",
  gap: 24,
  children: [
    {
      type: "card",
      title: "Empire Dashboard",
      children: [
        {
          type: "grid",
          columns: "3",
          gap: 16,
          children: [
            {
              type: "card",
              children: [
                { type: "text", content: "Estimated Revenue", variant: "caption", color: "#94a3b8" },
                { type: "text", content: "$0.00", color: "#4ade80" } // Style it directly maybe? Wait, DynamicRenderer doesn't support custom inline styles easily for big text unless it's handled via CSS classes.
              ]
            },
            {
              type: "card",
              children: [
                { type: "text", content: "Total Views", variant: "caption", color: "#94a3b8" },
                { type: "text", content: "0", color: "#e2e8f0" }
              ]
            },
            {
              type: "card",
              children: [
                { type: "text", content: "Subscriber Growth", variant: "caption", color: "#94a3b8" },
                { type: "text", content: "+0", color: "#a78bfa" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

console.log(JSON.stringify(schema, null, 2));

import { writeFile } from 'fs/promises';

const modalSchema = {
  type: "card",
  title: "Channel Profile Manager",
  children: [
    {
      type: "grid",
      columns: "2",
      gap: 16,
      children: [
        {
          type: "card",
          title: "Content Format",
          children: [
            { type: "button", label: "Independent Shorts", variant: "secondary" },
            { type: "button", label: "Independent Long Form", variant: "secondary" },
            { type: "button", label: "Funnel Mode", variant: "secondary" }
          ]
        },
        {
          type: "card",
          title: "Revenue Stack",
          children: [
            { type: "button", label: "AdSense", variant: "secondary" },
            { type: "button", label: "Digital Products", variant: "secondary" },
            { type: "button", label: "Affiliate Links", variant: "secondary" }
          ]
        }
      ]
    },
    {
      type: "button",
      label: "Confirm Incubation",
      action: "API_CALL",
      endpoint: "/api/agents/incubate",
      successMessage: "Channel incubated successfully!"
    }
  ]
};

const analyticsSchema = {
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
          title: "Estimated Revenue",
          children: [
            { type: "text", content: "$0.00", color: "#4ade80" }
          ]
        },
        {
          type: "card",
          title: "Total Views",
          children: [
            { type: "text", content: "0", color: "#e2e8f0" }
          ]
        },
        {
          type: "card",
          title: "Subscriber Growth",
          children: [
            { type: "text", content: "+0", color: "#a78bfa" }
          ]
        }
      ]
    }
  ]
};

await writeFile('ui_schema.json', JSON.stringify({ modal: modalSchema, analytics: analyticsSchema }, null, 2));
console.log("Schemas written to ui_schema.json");

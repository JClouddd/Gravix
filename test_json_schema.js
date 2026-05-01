const schema = {
  type: "card",
  title: "Channel Incubation",
  children: [
    { type: "text", content: "Content Format:" },
    { type: "grid", columns: "auto", children: [
        { type: "button", label: "Independent Shorts" },
        { type: "button", label: "Independent Long Form" },
        { type: "button", label: "Funnel Mode" }
      ]
    },
    { type: "text", content: "Revenue Stack:" },
    { type: "grid", columns: "auto", children: [
        { type: "button", label: "AdSense" },
        { type: "button", label: "Digital Products" },
        { type: "button", label: "Affiliate Links" }
      ]
    },
    { type: "button", label: "Generate Channel Lore", action: "API_CALL", endpoint: "/api/agents/incubate" },
    { type: "button", label: "Generate Video Script", action: "API_CALL", endpoint: "/api/agents/script" }
  ]
};
console.log(JSON.stringify(schema, null, 2));

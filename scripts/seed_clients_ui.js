const { GoogleAuth } = require("google-auth-library");

async function seedUI() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });

  const client = await auth.getClient();
  const projectId = await auth.getProjectId();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/dynamic_ui`;

  const structures = [
    {
      documentId: "clients_hub_contacts",
      fields: {
        schema: {
          stringValue: JSON.stringify({
            type: "object",
            title: "Contacts List",
            properties: {
              contacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" }
                  }
                }
              }
            }
          })
        },
        type: { stringValue: "view" },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    },
    {
      documentId: "clients_hub_meet_scheduler",
      fields: {
        schema: {
          stringValue: JSON.stringify({
            type: "object",
            title: "Meeting Scheduler",
            properties: {
              title: { type: "string", title: "Meeting Title" },
              start: { type: "string", format: "date-time", title: "Start Time" },
              end: { type: "string", format: "date-time", title: "End Time" },
              attendees: {
                type: "array",
                items: { type: "string", format: "email" },
                title: "Attendees Emails"
              }
            },
            required: ["title", "start", "end"]
          })
        },
        type: { stringValue: "form" },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    },
    {
      documentId: "clients_hub_sentiment_view",
      fields: {
        schema: {
          stringValue: JSON.stringify({
            type: "object",
            title: "Sentiment View",
            properties: {
              text: { type: "string", title: "Text input for analysis" },
              score: { type: "number", title: "Sentiment Score" },
              magnitude: { type: "number", title: "Sentiment Magnitude" }
            }
          })
        },
        type: { stringValue: "view" },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    }
  ];

  for (const doc of structures) {
    try {
      const docUrl = `${url}?documentId=${doc.documentId}`;
      const res = await client.request({
        url: docUrl,
        method: "POST",
        data: { fields: doc.fields },
      });
      console.log(`Successfully seeded ${doc.documentId}`);
    } catch (e) {
      if (e.response && e.response.status === 409) {
          console.log(`Document ${doc.documentId} already exists. Updating...`);
          const updateUrl = `${url}/${doc.documentId}`;
          await client.request({
            url: updateUrl,
            method: "PATCH",
            data: { fields: doc.fields }
          });
          console.log(`Successfully updated ${doc.documentId}`);
      } else {
          console.error(`Failed to seed ${doc.documentId}:`, e.message);
      }
    }
  }
}

seedUI().catch(console.error);

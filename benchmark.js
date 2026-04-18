const { performance } = require('perf_hooks');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function mockGoogleApiRequest(token, url) {
  await delay(50); // mock network delay
  return {
    payload: {
      headers: [{ name: "Subject", value: "Test Subject" }]
    },
    snippet: "Test snippet"
  };
}

async function sequential(sentMessages) {
  const emailTexts = [];
  for (const msg of sentMessages) {
    try {
      const fullMsg = await mockGoogleApiRequest(
        "token",
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
      );

      let subject = "";
      const headers = fullMsg.payload?.headers || [];
      const subjectHeader = headers.find(h => h.name.toLowerCase() === "subject");
      if (subjectHeader) subject = subjectHeader.value;

      let body = fullMsg.snippet || "";
      emailTexts.push(`Subject: ${subject}\nBody:\n${body}\n`);
    } catch (e) {
      console.error(`Failed to fetch details for msg ${msg.id}`, e);
    }
  }
  return emailTexts;
}

async function concurrent(sentMessages) {
  const emailTexts = [];
  const promises = sentMessages.map(async (msg) => {
    try {
      const fullMsg = await mockGoogleApiRequest(
        "token",
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
      );

      let subject = "";
      const headers = fullMsg.payload?.headers || [];
      const subjectHeader = headers.find(h => h.name.toLowerCase() === "subject");
      if (subjectHeader) subject = subjectHeader.value;

      let body = fullMsg.snippet || "";
      return `Subject: ${subject}\nBody:\n${body}\n`;
    } catch (e) {
      console.error(`Failed to fetch details for msg ${msg.id}`, e);
      return null;
    }
  });

  const results = await Promise.all(promises);
  for (const res of results) {
    if (res !== null) emailTexts.push(res);
  }
  return emailTexts;
}

async function run() {
  const messages = Array.from({ length: 20 }, (_, i) => ({ id: i }));

  const startSeq = performance.now();
  await sequential(messages);
  const endSeq = performance.now();
  console.log(`Sequential: ${endSeq - startSeq} ms`);

  const startConc = performance.now();
  await concurrent(messages);
  const endConc = performance.now();
  console.log(`Concurrent: ${endConc - startConc} ms`);
}

run();

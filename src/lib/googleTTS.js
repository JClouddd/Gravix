export async function synthesizeSpeech(text, voiceModel = "en-US-Journey-F") {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_CLOUD_API_KEY is not defined");
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const payload = {
    input: { text },
    voice: { name: voiceModel, languageCode: "en-US" },
    audioConfig: { audioEncoding: "MP3" }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Google TTS API Error (${response.status}): ${errorData}`);
  }

  const data = await response.json();

  if (!data.audioContent) {
    throw new Error("No audioContent returned from Google TTS");
  }

  return data.audioContent;
}

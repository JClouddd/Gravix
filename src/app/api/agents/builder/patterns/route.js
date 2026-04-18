import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";

export async function GET() {
  try {
    const patternsRef = adminDb.collection("code_patterns");
    const snapshot = await patternsRef.get();
    const patterns = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ patterns });
  } catch (error) {
    console.error("Error fetching code patterns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 1. Fetch recent merged PRs
    const prsRes = await fetch("https://api.github.com/repos/JClouddd/Gravix/pulls?state=closed&sort=updated&per_page=10", {
      headers: { "User-Agent": "Gravix-Builder-Agent" }
    });

    if (!prsRes.ok) {
      throw new Error(`GitHub API failed: ${prsRes.statusText}`);
    }

    const prs = await prsRes.json();
    const mergedPrs = prs.filter(pr => pr.merged_at);

    // 2. For each PR, get file changes
    const fetchPromises = mergedPrs.map(async (pr) => {
      try {
        const filesRes = await fetch(`https://api.github.com/repos/JClouddd/Gravix/pulls/${pr.number}/files`, {
          headers: { "User-Agent": "Gravix-Builder-Agent" }
        });
        if (filesRes.ok) {
          const files = await filesRes.json();
          const changes = [];
          files.forEach(f => {
            if (f.patch) {
              changes.push(`File: ${f.filename}\nDiff:\n${f.patch}\n`);
            }
          });
          return changes;
        }
      } catch (err) {
        console.error(`Error fetching files for PR ${pr.number}:`, err);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    const allChanges = results.flat();

    if (allChanges.length === 0) {
      return NextResponse.json({ patternsFound: 0, message: "No recent changes found." });
    }

    const changesText = allChanges.join("\n---\n");

    // 3. Send file changes to Gemini
    const prompt = `Analyze these recent code changes from merged PRs. Look for reusable patterns, common structures, and repeated approaches. Extract any patterns that could be templated for future use.

Respond ONLY with a JSON object in this exact format:
{
  "patterns": [
    {
      "name": "string (name of pattern)",
      "description": "string (what it does)",
      "fileTypes": ["string", "string"],
      "example": "string (brief code example)",
      "frequency": "string (estimated frequency)"
    }
  ]
}

Code changes:
${changesText.slice(0, 50000)} // Limit to avoid token overflow`;

    const generatedText = await generate(prompt, "system", "gemini-2.5-flash");

    // Extract JSON from response
    let parsedData = { patterns: [] };
    try {
      // Find JSON array or object
      const jsonStr = generatedText.replace(/```json\n?|```/g, "").trim();
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        parsedData = JSON.parse(jsonStr.substring(startIdx, endIdx + 1));
      }
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON", e);
    }

    // 4. Store in Firestore
    let storedCount = 0;
    if (parsedData.patterns && Array.isArray(parsedData.patterns)) {
      for (const pattern of parsedData.patterns) {
        const docId = pattern.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await adminDb.collection("code_patterns").doc(docId).set( {
          ...pattern,
          updatedAt: new Date()
        });
        storedCount++;
      }
    }

    return NextResponse.json({
      patternsFound: storedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error extracting patterns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

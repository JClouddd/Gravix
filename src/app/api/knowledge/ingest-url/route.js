import { classifyContent, createStagingEntry } from "@/lib/knowledgeEngine";

/**
 * POST /api/knowledge/ingest-url
 * Ingests content from a URL (webpage or YouTube)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { url, type = "webpage" } = body;

    if (!url) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    let extractedText = "";
    let title = url;

    if (type === "youtube") {
      // Extract YouTube video ID
      const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";
      extractedText = `YouTube video: ${url} - Content pending Gemini analysis`;
      title = `YouTube Video (${videoId})`;
    } else {
      // Default to webpage
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();

        // Extract a basic title if available
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }

        // Strip HTML tags
        extractedText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ') // Remove scripts
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')   // Remove styles
          .replace(/<[^>]+>/g, ' ')                                            // Remove HTML tags
          .replace(/\s+/g, ' ')                                                // Replace multiple spaces
          .trim();

      } catch (err) {
        throw new Error(`Failed to process webpage: ${err.message}`);
      }
    }

    // Limit text length to avoid token limits for classification
    const textForAnalysis = extractedText.substring(0, 30000);

    // Send to Gemini for classification and summarization
    const classification = await classifyContent(textForAnalysis, title);

    // Calculate word count
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;

    // Create staging entry (optional, but good for consistency with /ingest)
    const entry = createStagingEntry({
      content: extractedText,
      title: classification?.suggestedTitle || title,
      type,
      source: "url",
      classification,
    });

    return Response.json({
      success: true,
      ingested: true,
      title: entry.title,
      summary: classification.summary,
      wordCount,
      classification,
      entry, // Return the entry to match /ingest structure for the frontend
    });
  } catch (error) {
    console.error("[/api/knowledge/ingest-url]", error);
    return Response.json(
      { error: error.message || "URL Ingestion failed" },
      { status: 500 }
    );
  }
}

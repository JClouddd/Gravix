export const dynamic = "force-dynamic";

export async function GET(request) {
  const stream = new ReadableStream({
    start(controller) {
      let counter = 0;
      const intervalId = setInterval(() => {
        counter++;

        // Simulate orchestration node spawns and links
        const isRoot = counter === 1;
        const parentId = isRoot ? null : `node-${Math.floor(Math.random() * (counter - 1)) + 1}`;

        const payload = {
          id: `node-${counter}`,
          type: "spawn",
          agent: counter % 2 === 0 ? "gemini-2.5-flash" : "gemini-2.5-pro",
          status: "running",
          parentId: parentId,
          timestamp: Date.now()
        };

        const data = `data: ${JSON.stringify(payload)}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch (e) {
          clearInterval(intervalId);
        }
      }, 2000);

      // Clean up when the connection is closed
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}

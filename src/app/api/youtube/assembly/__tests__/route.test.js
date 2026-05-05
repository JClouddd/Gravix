import { describe, it, expect, vi } from "vitest";
import { POST } from "../route";

vi.mock("@/lib/errorLogger", () => ({
  logRouteError: vi.fn(),
}));

vi.mock("@/lib/workers/ffmpegWorker", () => ({
  stitchVideos: vi.fn().mockResolvedValue("/tmp/mock.mp4"),
}));

vi.mock("next/server", () => ({
  after: vi.fn((fn) => fn()),
}));

describe("/api/youtube/assembly", () => {
  it("should return an error if assets is missing", async () => {
    const request = new Request("http://localhost/api/youtube/assembly", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return an error if assets is not an array or is empty", async () => {
    const request = new Request("http://localhost/api/youtube/assembly", {
      method: "POST",
      body: JSON.stringify({ assets: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return a successful response with assemblyId for valid assets", async () => {
    const request = new Request("http://localhost/api/youtube/assembly", {
      method: "POST",
      body: JSON.stringify({ assets: ["asset1", "asset2"] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.assemblyId).toBeDefined();
    expect(data.status).toBe("queued");
  });
});

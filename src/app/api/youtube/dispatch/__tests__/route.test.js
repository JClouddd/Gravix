import { describe, it, expect, vi } from "vitest";
import { POST } from "../route";

vi.mock("@/lib/errorLogger", () => ({
  logRouteError: vi.fn(),
}));

describe("/api/youtube/dispatch", () => {
  it("should return an error if provider is missing", async () => {
    const request = new Request("http://localhost/api/youtube/dispatch", {
      method: "POST",
      body: JSON.stringify({ prompt: "Test prompt" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return an error if provider is invalid", async () => {
    const request = new Request("http://localhost/api/youtube/dispatch", {
      method: "POST",
      body: JSON.stringify({ provider: "invalid", prompt: "Test prompt" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return a successful response with jobId for a valid provider", async () => {
    const request = new Request("http://localhost/api/youtube/dispatch", {
      method: "POST",
      body: JSON.stringify({ provider: "veo", prompt: "Test prompt" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.provider).toBe("veo");
    expect(data.jobId).toBeDefined();
  });
});

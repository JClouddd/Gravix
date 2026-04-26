import { describe, it, expect, vi } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/errorLogger", () => ({
  logRouteError: vi.fn(),
}));

vi.mock("@/lib/geminiClient", () => ({
  generate: vi.fn().mockResolvedValue({
    text: '["AI Agents", "Next.js 15", "Quantum Computing"]'
  })
}));

describe("/api/youtube/trends", () => {
  it("should return a list of trends", async () => {
    const request = new Request("http://localhost/api/youtube/trends");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.trends).toBeDefined();
    expect(data.trends.length).toBeGreaterThan(0);
    expect(data.trends).toContain("AI Agents");
  });
});

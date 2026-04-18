import { GoogleGenerativeAI } from "@google/generative-ai";
async function main() {
  const genAI = new GoogleGenerativeAI("test");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  try {
    const res = await model.countTokens({ contents: [{role: "user", parts: [{text: "Hello"}]}] });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
main();

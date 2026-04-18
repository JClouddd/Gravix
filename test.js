import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI("test");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
console.log(Object.keys(model).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(model))));

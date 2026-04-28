import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

function parseDesignToCSS(markdown) {
  let css = ":root {\n";
  const bgMatch = markdown.match(/\*\*Background\s*\(\d+%\)\*\*:\s*`([^`]+)`/);
  const secMatch = markdown.match(/\*\*Secondary\s*\(\d+%\)\*\*:\s*`([^`]+)`/);
  const tertMatch = markdown.match(/\*\*Tertiary[^*]*\*\*:\s*`([^`]+)`/);
  const accMatch = markdown.match(/\*\*Accent\s*\(\d+%\)\*\*:\s*`([^`]+)`/);

  if (bgMatch) css += `  --bg-primary: ${bgMatch[1]};\n`;
  if (secMatch) css += `  --bg-secondary: ${secMatch[1]};\n`;
  if (tertMatch) css += `  --bg-tertiary: ${tertMatch[1]};\n`;
  if (accMatch) css += `  --accent: ${accMatch[1]};\n`;

  const successMatch = markdown.match(/\*\*Success\*\*:\s*`([^`]+)`/);
  const warningMatch = markdown.match(/\*\*Warning\*\*:\s*`([^`]+)`/);
  const errorMatch = markdown.match(/\*\*Error\*\*:\s*`([^`]+)`/);
  const infoMatch = markdown.match(/\*\*Info\*\*:\s*`([^`]+)`/);

  if (successMatch) css += `  --success: ${successMatch[1]};\n`;
  if (warningMatch) css += `  --warning: ${warningMatch[1]};\n`;
  if (errorMatch) css += `  --error: ${errorMatch[1]};\n`;
  if (infoMatch) css += `  --info: ${infoMatch[1]};\n`;

  const radiusMatch = markdown.match(/\*\*Border Radius\s*\(Cards\)\*\*:\s*`([^`]+)`/);
  const btnRadiusMatch = markdown.match(/\*\*Border Radius\s*\(Buttons\)\*\*:\s*`([^`]+)`/);
  
  if (radiusMatch) css += `  --radius-lg: ${radiusMatch[1]};\n`;
  if (btnRadiusMatch) css += `  --radius-md: ${btnRadiusMatch[1]};\n`;

  css += "}\n";
  return css;
}

export async function GET() {
  try {
    const designPath = path.join(process.cwd(), "DESIGN.md");
    const content = await fs.readFile(designPath, "utf-8");
    const css = parseDesignToCSS(content);
    return NextResponse.json({ content, css });
  } catch (err) {
    console.error("Error reading DESIGN.md:", err);
    return NextResponse.json({ error: "Failed to read DESIGN.md" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }
    
    const designPath = path.join(process.cwd(), "DESIGN.md");
    await fs.writeFile(designPath, content, "utf-8");
    const css = parseDesignToCSS(content);
    
    return NextResponse.json({ success: true, css });
  } catch (err) {
    console.error("Error writing DESIGN.md:", err);
    return NextResponse.json({ error: "Failed to write DESIGN.md" }, { status: 500 });
  }
}

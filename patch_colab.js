import fs from 'fs';

let content = fs.readFileSync('src/app/api/colab/execute/route.js', 'utf8');

const newNotebooks = `const NOTEBOOKS = [
  {
    id: "stock_analysis",
    name: "Stock Analysis",
    description: "Stock analysis with RSI and MACD",
    costEstimate: "$0.05-0.10",
    parameters: [
      { name: "ticker", type: "string", required: true, description: "Stock ticker symbol" },
      { name: "period", type: "string", default: "1y", description: "Analysis period" },
    ],
  },
  {
    id: "portfolio_optimizer",
    name: "Portfolio Optimizer",
    description: "Portfolio optimization",
    costEstimate: "$0.05-0.10",
    parameters: [
      { name: "tickers", type: "array", required: true, description: "Current portfolio holdings" },
      { name: "risk_tolerance", type: "string", default: "moderate", description: "Risk level" },
    ],
  },
  {
    id: "health_trends",
    name: "Health Trends",
    description: "Health data trend analysis",
    costEstimate: "$0.05-0.10",
    parameters: [
      { name: "data_json", type: "string", required: true, description: "Health data JSON" },
    ],
  },
  {
    id: "document_processor",
    name: "Document Processor",
    description: "Batch document NLP",
    costEstimate: "$0.05-0.10",
    parameters: [
      { name: "documents_json", type: "string", required: true, description: "Documents data" },
    ],
  },
  {
    id: "data_pipeline",
    name: "Data Pipeline",
    description: "Generic ETL",
    costEstimate: "$0.05-0.10",
    parameters: [
      { name: "source_url", type: "string", required: true, description: "Input data source" },
      { name: "output_format", type: "string", default: "json", description: "Output format" },
    ],
  },
];`;

content = content.replace(/const NOTEBOOKS = \[\s*\{[\s\S]*?\];/m, newNotebooks);

fs.writeFileSync('src/app/api/colab/execute/route.js', content);
console.log('patched notebooks array');

import fs from 'fs';

let content = fs.readFileSync('src/components/modules/ColabModule.js', 'utf8');

const updatedBodyParams = `
        body: JSON.stringify({
          notebookId: selectedNotebook.id,
          parameters: formattedParams
        })
`;
content = content.replace(/body: JSON\.stringify\(\{[\s\S]*?\}\)/, updatedBodyParams.trim());

const displayHistory = `
                <p className="body-sm" style={{ color: "var(--text-secondary)" }}>
                  {exec.message}
                </p>
                {exec.executionTime && (
                  <p className="body-sm" style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
                    Execution Time: {(exec.executionTime / 1000).toFixed(2)}s
                  </p>
                )}
                {exec.results && (
                  <div style={{ marginTop: 12, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", overflowX: "auto" }}>
                    <pre className="body-sm" style={{ margin: 0 }}>
                      {typeof exec.results === 'object' ? JSON.stringify(exec.results, null, 2) : exec.results}
                    </pre>
                  </div>
                )}
                {exec.chartUrls && exec.chartUrls.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {exec.chartUrls.map((url, i) => (
                      <img key={i} src={url} alt={\`Chart \${i+1}\`} style={{ maxWidth: '100%', borderRadius: "var(--radius-md)" }} />
                    ))}
                  </div>
                )}
              </div>
`;

content = content.replace(/<p className="body-sm" style=\{\{ color: "var\(--text-secondary\)" \}\}>\s*\{exec\.message\}\s*<\/p>\s*<\/div>/m, displayHistory.trim());

const addCostEstimate = `
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {nb.runtime && <span className="badge badge-info">runtime: {nb.runtime}</span>}
                {nb.estimatedDuration && <span className="badge badge-warning">~{nb.estimatedDuration}</span>}
                {nb.costEstimate && <span className="badge badge-success">~{nb.costEstimate}</span>}
              </div>
`;
content = content.replace(/<div style=\{\{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 \}\}>\s*\{nb\.runtime && <span className="badge badge-info">runtime: \{nb\.runtime\}<\/span>\}\s*\{nb\.estimatedDuration && <span className="badge badge-warning">~\{nb\.estimatedDuration\}<\/span>\}\s*<\/div>/m, addCostEstimate.trim());


fs.writeFileSync('src/components/modules/ColabModule.js', content);
console.log('patched history display and cost estimate');

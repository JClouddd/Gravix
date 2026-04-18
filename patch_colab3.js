import fs from 'fs';

let content = fs.readFileSync('src/components/modules/ColabModule.js', 'utf8');

const updatedSubmit = `
        setExecutionStatus("completed");
        setExecutionMessage("Execution completed");

        // Add to history
        setExecutionHistory(prev => [
          {
            id: \`exec_\${Date.now()}\`,
            notebook: result.notebook || selectedNotebook.name,
            status: "completed",
            time: new Date().toLocaleString(),
            executionTime: result.executionTime,
            parameters: result.parameters || formattedParams,
            message: "Execution finished.",
            results: result.results,
            chartUrls: result.chartUrls,
          },
          ...prev
        ]);
`;

content = content.replace(/setExecutionStatus\("completed"\);\s*setExecutionMessage\(result\.message \|\| "Execution completed"\);\s*\/\/ Add to history\s*setExecutionHistory\(prev => \[\s*\{\s*id: result\.executionId \|\| `exec_\$\{Date\.now\(\)\}`,\s*notebook: result\.notebook \|\| selectedNotebook\.name,\s*status: "completed",\s*time: new Date\(\)\.toLocaleString\(\),\s*parameters: result\.parameters,\s*message: result\.message\s*\},/m, `setExecutionStatus("completed");
        setExecutionMessage("Execution completed");

        // Add to history
        setExecutionHistory(prev => [
          {
            id: \`exec_\${Date.now()}\`,
            notebook: result.notebook || selectedNotebook.name,
            status: "completed",
            time: new Date().toLocaleString(),
            executionTime: result.executionTime,
            parameters: result.parameters || formattedParams,
            message: "Execution finished.",
            results: result.results,
            chartUrls: result.chartUrls,
          },`);


fs.writeFileSync('src/components/modules/ColabModule.js', content);
console.log('patched history addition');

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/', (req, res) => res.send('Gravix Sandbox Active'));

/**
 * Endpoint: /execute
 * Accepts files to write to the ephemeral disk, and a command to run against them.
 * Simulates compiling/linting to test AI code before pushing to GitHub.
 */
app.post('/execute', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.SANDBOX_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Sandbox API Key' });
  }

  const { files, command } = req.body;
  
  if (!files || !command) {
    return res.status(400).json({ error: 'files array and command string required.' });
  }

  const workspaceId = `workspace_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const workspacePath = path.join('/tmp', workspaceId);

  try {
    // 1. Create Workspace
    await fs.mkdir(workspacePath, { recursive: true });

    // 2. Write virtual files
    for (const file of files) {
      const filePath = path.join(workspacePath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf8');
    }

    // 3. Execute Command in isolated workspace
    // Timeout of 30 seconds to prevent infinite loops
    exec(command, { cwd: workspacePath, timeout: 30000 }, async (error, stdout, stderr) => {
      // 4. Cleanup Workspace
      await fs.rm(workspacePath, { recursive: true, force: true }).catch(console.error);

      res.json({
        success: !error,
        exitCode: error ? error.code : 0,
        stdout,
        stderr: stderr || (error ? error.message : '')
      });
    });

  } catch (err) {
    // Cleanup on write failure
    await fs.rm(workspacePath, { recursive: true, force: true }).catch(console.error);
    res.status(500).json({ error: 'Sandbox execution failure', details: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Gravix Sandbox listening on port ${PORT}`);
});

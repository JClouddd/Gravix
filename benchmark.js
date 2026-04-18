const fs = require('fs');

async function sequentialFetch(mergedPrs) {
    const allChanges = [];
    for (const pr of mergedPrs) {
      const filesRes = await fetch(`https://api.github.com/repos/JClouddd/Gravix/pulls/${pr.number}/files`, {
        headers: { "User-Agent": "Gravix-Builder-Agent" }
      });
      if (filesRes.ok) {
        const files = await filesRes.json();
        files.forEach(f => {
          if (f.patch) {
            allChanges.push(`File: ${f.filename}\nDiff:\n${f.patch}\n`);
          }
        });
      }
    }
    return allChanges;
}

async function concurrentFetch(mergedPrs) {
    const allChanges = [];
    const fetchPromises = mergedPrs.map(async (pr) => {
      try {
        const filesRes = await fetch(`https://api.github.com/repos/JClouddd/Gravix/pulls/${pr.number}/files`, {
          headers: { "User-Agent": "Gravix-Builder-Agent" }
        });
        if (filesRes.ok) {
          const files = await filesRes.json();
          const changes = [];
          files.forEach(f => {
            if (f.patch) {
              changes.push(`File: ${f.filename}\nDiff:\n${f.patch}\n`);
            }
          });
          return changes;
        }
      } catch (err) {
        console.error(err);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    for (const res of results) {
        allChanges.push(...res);
    }
    return allChanges;
}

async function run() {
    const prsRes = await fetch("https://api.github.com/repos/JClouddd/Gravix/pulls?state=closed&sort=updated&per_page=10", {
      headers: { "User-Agent": "Gravix-Builder-Agent" }
    });
    const prs = await prsRes.json();
    const mergedPrs = prs.filter(pr => pr.merged_at);

    console.log(`Testing with ${mergedPrs.length} PRs`);

    let startSeq = Date.now();
    await sequentialFetch(mergedPrs);
    let endSeq = Date.now();
    console.log(`Sequential: ${endSeq - startSeq}ms`);

    let startConc = Date.now();
    await concurrentFetch(mergedPrs);
    let endConc = Date.now();
    console.log(`Concurrent: ${endConc - startConc}ms`);
}

run();

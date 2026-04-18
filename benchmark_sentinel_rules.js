const { performance } = require('perf_hooks');

function runBaseline(rules, healthData) {
  const triggeredRules = [];
  for (const rule of rules) {
    const { condition, threshold, action } = rule;
    let thresholdExceeded = false;
    const numThreshold = Number(threshold);

    if (condition && !isNaN(numThreshold) && healthData.services) {
      if (condition.includes("latency")) {
        const serviceName = condition.split(".")[0];
        if (healthData.services[serviceName] && healthData.services[serviceName].latency) {
          if (healthData.services[serviceName].latency > numThreshold) {
            thresholdExceeded = true;
          }
        } else {
          const maxLatency = Math.max(...Object.values(healthData.services).map(s => s.latency || 0));
          if (maxLatency > numThreshold) {
            thresholdExceeded = true;
          }
        }
      } else if (condition.includes("error") || condition.includes("fail")) {
        const failedServices = Object.values(healthData.services).filter(s => s.status === "fail").length;
        if (failedServices >= numThreshold) {
          thresholdExceeded = true;
        }
      }
    }

    if (thresholdExceeded) {
      triggeredRules.push(rule);
    }
  }
  return triggeredRules.length;
}

function runOptimized(rules, healthData) {
  const triggeredRules = [];

  let maxLatency = 0;
  let failedServices = 0;
  if (healthData.services) {
    const servicesList = Object.values(healthData.services);
    maxLatency = Math.max(...servicesList.map(s => s.latency || 0), 0);
    failedServices = servicesList.filter(s => s.status === "fail").length;
  }

  for (const rule of rules) {
    const { condition, threshold, action } = rule;
    let thresholdExceeded = false;
    const numThreshold = Number(threshold);

    if (condition && !isNaN(numThreshold) && healthData.services) {
      if (condition.includes("latency")) {
        const serviceName = condition.split(".")[0];
        if (healthData.services[serviceName] && healthData.services[serviceName].latency) {
          if (healthData.services[serviceName].latency > numThreshold) {
            thresholdExceeded = true;
          }
        } else {
          if (maxLatency > numThreshold) {
            thresholdExceeded = true;
          }
        }
      } else if (condition.includes("error") || condition.includes("fail")) {
        if (failedServices >= numThreshold) {
          thresholdExceeded = true;
        }
      }
    }

    if (thresholdExceeded) {
      triggeredRules.push(rule);
    }
  }
  return triggeredRules.length;
}

const healthData = {
  services: {
    service1: { latency: 100, status: 'ok' },
    service2: { latency: 200, status: 'ok' },
    service3: { latency: 50, status: 'fail' },
    service4: { latency: 300, status: 'ok' },
    service5: { latency: 400, status: 'fail' },
    service6: { latency: 150, status: 'ok' },
    service7: { latency: 250, status: 'ok' },
    service8: { latency: 120, status: 'ok' },
    service9: { latency: 80, status: 'fail' },
    service10: { latency: 110, status: 'ok' },
  }
};

const rules = [];
// Generate a lot of rules to make the difference measurable
for (let i = 0; i < 10000; i++) {
  rules.push({ condition: 'global.latency', threshold: 150, action: 'notify' });
  rules.push({ condition: 'error', threshold: 1, action: 'notify' });
}

function benchmark(fn, name) {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    fn(rules, healthData);
  }
  const end = performance.now();
  console.log(`${name}: ${end - start} ms`);
}

// Warmup
runBaseline(rules, healthData);
runOptimized(rules, healthData);

benchmark(runBaseline, 'Baseline');
benchmark(runOptimized, 'Optimized');

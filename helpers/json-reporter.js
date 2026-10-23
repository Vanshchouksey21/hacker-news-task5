
import fs from 'node:fs/promises';
import path from 'node:path';

class JsonReporter {
  constructor() {
    this.results = [];
  }

  onTestEnd(test, result) {
    const metricsAnnotation = test.annotations.find(
      annotation => annotation.type === 'metrics'
    );

    let metrics = null;

    if (metricsAnnotation) {
      try {
        metrics = JSON.parse(metricsAnnotation.description);
      } catch {
        metrics = null;
      }
    }

    this.results.push({
      test: test.title,
      file: test.location.file,
      status: result.status,
      durationMs: result.duration,
      metrics,
      errors: result.errors.map(error => error.message),
    });
  }

  async onEnd() {
    const outputDir = path.resolve('test-results');
    await fs.mkdir(outputDir, { recursive: true });

    const report = {
      generatedAt: new Date().toISOString(),
      total: this.results.length,
      passed: this.results.filter(test => test.status === 'passed').length,
      failed: this.results.filter(test =>
        ['failed', 'timedOut', 'interrupted'].includes(test.status)
      ).length,
      skipped: this.results.filter(test =>
        test.status === 'skipped'
      ).length,
      tests: this.results,
    };

    await fs.writeFile(
      path.join(outputDir, 'custom-report.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    );
  }
}

export default JsonReporter;

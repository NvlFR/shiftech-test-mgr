import type { TestResultStatus, TestRunSummary } from '../types/domain';

export function calculateTestRunSummary(results: ReadonlyArray<{ status: TestResultStatus }>): TestRunSummary {
  const counts = {
    pass: 0,
    fail: 0,
    skip: 0,
    blocked: 0,
    notRun: 0,
  };

  for (const result of results) {
    if (result.status === 'pass') counts.pass += 1;
    if (result.status === 'fail') counts.fail += 1;
    if (result.status === 'skip') counts.skip += 1;
    if (result.status === 'blocked') counts.blocked += 1;
    if (result.status === 'not_run') counts.notRun += 1;
  }

  const total = results.length;
  const executed = total - counts.notRun;

  return {
    total,
    executed,
    progressPercent: total === 0 ? 0 : Math.round((executed / total) * 100),
    ...counts,
  };
}

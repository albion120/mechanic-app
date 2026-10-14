import { expect, it } from 'vitest';
import { serviceDescription, validateDiagnosis } from './diagnosis';

const valid = { summary: 'Possible issue.', possibleCauses: ['Belt wear'], urgency: 'Medium', safetyAdvice: 'Watch for warnings.', recommendedAction: 'Arrange inspection.', needsMoreInfo: false, followUpQuestions: [] };
it('rejects malformed AI strings, urgency and non-string causes', () => {
  for (const patch of [{ urgency: 'certain' }, { possibleCauses: [{}] }, { summary: null }, { needsMoreInfo: true, followUpQuestions: [] }])
    expect(() => validateDiagnosis({ ...valid, ...patch })).toThrow();
});
it('includes original symptoms, code and orienting summary in a service draft', () => {
  const text = serviceDescription('Noise while braking', valid, 'P0301');
  expect(text).toContain('Noise while braking');
  expect(text).toContain('P0301');
  expect(text).toContain('Possible issue.');
});

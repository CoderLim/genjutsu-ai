import assert from 'node:assert/strict';
import test from 'node:test';
import { isGeneratorRequestIdConflict } from './request-binding';

test('request IDs linked to a different generation are rejected', () => {
  assert.equal(isGeneratorRequestIdConflict({ id: 'elsewhere' }, 'current'), true);
  assert.equal(isGeneratorRequestIdConflict({ id: 'current' }, 'current'), false);
  assert.equal(isGeneratorRequestIdConflict(null, 'current'), false);
});

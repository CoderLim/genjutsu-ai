import assert from 'node:assert/strict';
import test from 'node:test';

import { getGeneratorModel, listGeneratorModels } from './catalog';
import { getGeneratorSettingChoices } from './form-state';
import { createGeneratorState, normalizeGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';
import { buildGeneratorProviderRequest } from './adapters';
import { assertGeneratorDraft } from './validation';
import { getWorkflowSpec, type FieldValue, type GeneratorModel, type GeneratorState } from './types';

const MEDIA = { referenceImages: [], referenceVideos: [], referenceAudio: [] };

function choices(model: GeneratorModel, state: GeneratorState, name: string): FieldValue[] {
  return getGeneratorSettingChoices(getWorkflowSpec(model, state.workflow), state.params, name);
}

test('each supported model/workflow offers only selectable, billable setting values', () => {
  const fields = ['aspectRatio', 'duration', 'resolution', 'outputCount'];
  for (const model of listGeneratorModels()) {
    for (const workflow of Object.keys(model.workflows)) {
      const state = updateGeneratorState(createGeneratorState(model), model, {
        workflow: workflow as GeneratorState['workflow'],
      });
      const spec = getWorkflowSpec(model, state.workflow);
      for (const name of fields) {
        const supported = choices(model, state, name);
        if (!spec.fields[name]) {
          assert.deepEqual(supported, [], model.id + '/' + workflow + '/' + name);
          continue;
        }
        assert.ok(supported.length > 0, model.id + '/' + workflow + '/' + name);
        assert.ok(supported.includes(state.params[name]), model.id + '/' + workflow + '/' + name);
        for (const value of supported) {
          const picked = updateGeneratorState(state, model, {
            params: { [name]: value },
          });
          assert.equal(picked.params[name], value, model.id + '/' + workflow + '/' + name + '=' + value);
          assert.doesNotThrow(() => assertGeneratorDraft(picked, model), model.id + '/' + name);
          assert.ok(calculateGeneratorCredits(picked, model).credits > 0, model.id + '/' + name);
        }
      }
    }
  }
});

test('Seedance, H3 and Kling text-video aspect ratio options differ by model', () => {
  for (const [id, expected] of [
    ['seedance-2-fast', ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']],
    ['seedance-2.5', ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']],
    ['minimax-h3', ['16:9', '21:9', '4:3', '1:1', '3:4', '9:16']],
    ['kling-3-turbo', ['16:9', '9:16', '1:1']],
    ['kling-4', ['16:9', '9:16', '1:1']],
  ] as const) {
    const model = getGeneratorModel(id);
    const state = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'text-to-video',
    });
    assert.deepEqual(choices(model, state, 'aspectRatio'), expected, id);
    // First Frame has an optional upload. Until a start image is present,
    // the form still needs text-to-video aspect ratio settings.
    const frame = updateGeneratorState(state, model, { workflow: 'first-frame' });
    assert.deepEqual(choices(model, frame, 'aspectRatio'), expected, id);
  }
});

test('model switch clamps incompatible durations, resolutions, and output count', () => {
  const seedance = getGeneratorModel('seedance-2.5');
  const kling = getGeneratorModel('kling-3-turbo');
  const long = updateGeneratorState(createGeneratorState(seedance), seedance, {
    workflow: 'text-to-video',
    params: { aspectRatio: 'auto', resolution: '480p', duration: 28 },
  });
  const switched = normalizeGeneratorState(long, kling, 'text-to-video');
  assert.equal(switched.params.aspectRatio, '16:9');
  assert.equal(switched.params.resolution, '720p');
  assert.equal(switched.params.duration, 5);
  assert.ok(choices(kling, switched, 'duration').includes(15));
  assert.equal(choices(kling, switched, 'duration').includes(16), false);
  assert.deepEqual(choices(kling, switched, 'resolution'), ['720p']);
  assert.deepEqual(choices(kling, switched, 'outputCount'), [1]);
  assert.doesNotThrow(() => assertGeneratorDraft(switched, kling));

  const pro = getGeneratorModel('nano-banana-pro');
  const lite = getGeneratorModel('nano-banana-2-lite');
  const nano2 = getGeneratorModel('nano-banana-2');
  const extreme = updateGeneratorState(createGeneratorState(nano2), nano2, {
    params: { aspectRatio: '1:8', resolution: '4K', outputCount: 4 },
  });
  const toPro = normalizeGeneratorState(extreme, pro, pro.defaultWorkflow);
  assert.equal(toPro.params.aspectRatio, '1:1');
  assert.equal(toPro.params.resolution, '4K');
  assert.equal(toPro.params.outputCount, 4);
  const toLite = normalizeGeneratorState(toPro, lite, lite.defaultWorkflow);
  assert.equal(toLite.params.resolution, '1K');
  assert.equal(toLite.params.outputCount, 4);
  assert.doesNotThrow(() => assertGeneratorDraft(toLite, lite));
});

test('Nano Banana 2 vs Pro and Lite image ratio and resolution choices are distinct', () => {
  const nano2 = getGeneratorModel('nano-banana-2');
  const pro = getGeneratorModel('nano-banana-pro');
  const lite = getGeneratorModel('nano-banana-2-lite');
  const two = createGeneratorState(nano2);
  const professional = createGeneratorState(pro);
  const light = createGeneratorState(lite);
  assert.equal(choices(nano2, two, 'aspectRatio').length, 15);
  assert.equal(choices(pro, professional, 'aspectRatio').length, 11);
  assert.equal(choices(lite, light, 'aspectRatio').length, 15);
  assert.deepEqual(choices(lite, light, 'resolution'), ['1K']);
  assert.deepEqual(choices(pro, professional, 'resolution'), ['1K', '2K', '4K']);
  assert.ok(choices(nano2, two, 'aspectRatio').includes('8:1'));
  assert.equal(choices(pro, professional, 'aspectRatio').includes('8:1'), false);
});

test('MiniMax Image offers 15 safe aspect ratios at each resolution, including 3:1 boundaries', () => {
  for (const id of ['minimax-h3-image', 'minimax-h3-image-highspeed']) {
    const model = getGeneratorModel(id);
    const state = createGeneratorState(model);
    const ratios = choices(model, state, 'aspectRatio');
    assert.equal(ratios.length, 15, id);
    for (const ratio of ratios) {
      for (const resolution of ['1K', '2K', '4K']) {
        const selected = updateGeneratorState(state, model, {
          params: { aspectRatio: ratio, resolution },
        });
        const request = buildGeneratorProviderRequest(selected, MEDIA);
        const size = request.image_size as { width: number; height: number };
        assert.ok(size.width * size.height >= 655360, id + ':' + resolution + ':' + ratio);
        assert.ok(size.width * size.height <= 20000000, id + ':' + resolution + ':' + ratio);
        assert.ok(size.width / size.height <= 3 && size.height / size.width <= 3,
          id + ':' + resolution + ':' + ratio);
        assert.equal(size.width % 32, 0);
        assert.equal(size.height % 32, 0);
      }
    }
  }
});

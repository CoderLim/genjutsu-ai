import assert from 'node:assert/strict';
import test from 'node:test';

import { MOTION_TEMPLATES } from '@/components/landing/motion-templates';

import {
  buildSeedanceWorkflowPrompt,
  getSeedanceTask,
  SEEDANCE_REFERENCE_IDENTITY_RULES,
} from './workflow';

/** Pre-change final-prompt lengths (Seedance payload prompt = workflow output). */
const BASELINE_PROMPT_LENGTHS = {
  objectsSwapPerson: 1334,
  objectsSwapMulti: 1416,
  objectsSwapNoPrompt: 1369,
  objectsSwapNoPromptMulti: 1539,
  objectsSwapSayItRight: 2689,
  motionTransferDance: 746,
  motionTransferMulti: 1244,
  motionTransferNoPrompt: 907,
  motionTransferNoPromptMulti: 1417,
} as const;

const SAY_IT_RIGHT_PROMPT =
  MOTION_TEMPLATES.find((template) => template.id === 'say-it-right-dance')
    ?.prompt ?? '';

test('maps motion transfer to Seedance reference task', () => {
  assert.equal(getSeedanceTask('motion-transfer'), 'reference');
});

test('maps object swap to Seedance editing task', () => {
  assert.equal(getSeedanceTask('objects-swap'), 'editing');
});

test('shared reference identity rules are defined once', () => {
  assert.match(SEEDANCE_REFERENCE_IDENTITY_RULES, /REFERENCE IDENTITY:/);
  assert.match(SEEDANCE_REFERENCE_IDENTITY_RULES, /authoritative identity/);
  assert.match(
    SEEDANCE_REFERENCE_IDENTITY_RULES,
    /Do not retain or blend the source performer's identity/
  );
  assert.match(
    SEEDANCE_REFERENCE_IDENTITY_RULES,
    /For partial edits \(clothing, props, objects, background, style\)/
  );
  assert.match(
    SEEDANCE_REFERENCE_IDENTITY_RULES,
    /multiple references may be different subjects or multiple views/
  );

  const objectSwap = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the person with Reference 1',
    imageCount: 1,
  });
  const motionTransfer = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Make the person from Reference 1 dance',
    imageCount: 1,
  });

  assert.equal(
    objectSwap.split(SEEDANCE_REFERENCE_IDENTITY_RULES).length - 1,
    1
  );
  assert.equal(
    motionTransfer.split(SEEDANCE_REFERENCE_IDENTITY_RULES).length - 1,
    1
  );
});

test('object swap full person replacement uses reference as identity source', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the lead rider with Reference 1',
    imageCount: 1,
  });

  assert.match(prompt, /Edit @Video1 by replacing only the targets/);
  assert.match(prompt, /OBJECT SWAP:/);
  assert.match(prompt, /REFERENCE IDENTITY:/);
  assert.match(prompt, /Reference 1 maps to @Image1/);
  assert.match(
    prompt,
    /Full-subject replacements \(person, character, animal, or object\)/
  );
  assert.match(prompt, /complete reference appearance, not selected features/);
  assert.match(prompt, /authoritative identity/);
  assert.match(
    prompt,
    /Do not retain or blend the source performer's identity/
  );
  assert.match(prompt, /Replace the lead rider with Reference 1/);
});

test('motion transfer dancer uses reference as performer identity', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Make the person from Reference 1 dance',
    imageCount: 1,
  });

  assert.match(prompt, /MOTION TRANSFER:/);
  assert.match(prompt, /REFERENCE IDENTITY:/);
  assert.match(
    prompt,
    /When a reference defines the performer, animate that reference subject/
  );
  assert.match(
    prompt,
    /rather than retaining the original performer's identity/
  );
  assert.match(prompt, /authoritative identity/);
  assert.match(prompt, /Make the person from Reference 1 dance/);
  assert.doesNotMatch(prompt, /as a visual reference according to/);
});

test('clothing-only object swap preserves unrelated identities', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt:
      'Replace only the red jacket with the clothing from Reference 1',
    imageCount: 1,
  });

  assert.match(
    prompt,
    /For partial edits \(clothing, props, objects, background, style\), change only those elements and preserve unrelated identities/
  );
  assert.match(
    prompt,
    /Replace only the red jacket with the clothing from Reference 1/
  );
  assert.match(
    prompt,
    /When a reference defines an entire person, character, or animal/
  );
});

test('background-only object swap preserves unrelated identities', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the street with the forest location from Reference 1',
    imageCount: 1,
  });

  assert.match(
    prompt,
    /For partial edits \(clothing, props, objects, background, style\), change only those elements and preserve unrelated identities/
  );
  assert.match(prompt, /Preserve non-targets, motion, camera, timing/);
  assert.match(
    prompt,
    /Replace the street with the forest location from Reference 1/
  );
  assert.doesNotMatch(
    prompt,
    /preserve the original (background|scene|location|environment)/i
  );
});

test('object swap maps two people to two reference images without mixing', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt:
      'Replace the lead rider with Reference 1 and the pursuing rider with Reference 2',
    imageCount: 2,
  });

  assert.match(prompt, /Reference 1 = @Image1/);
  assert.match(prompt, /Reference 2 = @Image2/);
  assert.match(prompt, /map each reference to its target/);
  assert.match(prompt, /Do not merge unrelated reference identities/);
  assert.match(prompt, /Respect explicit reference-to-target mappings/);
  assert.match(
    prompt,
    /Replace the lead rider with Reference 1 and the pursuing rider with Reference 2/
  );
});

test('object swap allows multiple views of the same target', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt:
      'References 1, 2, and 3 are different views of the same squirrel. Replace the squirrel with that identity.',
    imageCount: 3,
  });

  assert.match(prompt, /Reference 3 = @Image3/);
  assert.match(
    prompt,
    /multiple references may be different subjects or multiple views of one subject/
  );
  assert.doesNotMatch(
    prompt,
    /Do not assume they are alternate views of the same subject/
  );
});

test('object swap covers non-person targets such as cars, products, and animals', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the orange motorcycle with Reference 1',
    imageCount: 1,
  });

  assert.match(prompt, /person, character, animal, or object/);
  assert.match(prompt, /Replace the orange motorcycle with Reference 1/);
});

test('object swap keeps cross-shot identity through cuts and occlusion', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the pursuing rider with Reference 1',
    imageCount: 1,
  });

  assert.match(
    prompt,
    /apply consistently across angles, close-ups, cuts, occlusions, and reappearances/
  );
  assert.match(
    prompt,
    /keep identity consistent across frames, cuts, and occlusions/
  );
  assert.match(
    prompt,
    /A subject assigned to a reference is a replacement target/
  );
});

test('object swap without a prompt falls back conservatively', () => {
  const single = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    imageCount: 1,
  });
  const multi = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    imageCount: 2,
  });

  assert.match(
    single,
    /Replace the most prominent matching target in @Video1 with Reference 1/
  );
  assert.match(multi, /Use visual correspondence conservatively/);
  assert.match(multi, /Only modify targets with a clear match/);
  assert.match(multi, /do not merge unrelated references/);
});

test('motion transfer keeps motion-camera contract for non-identity edits', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Move the whole fight into the forest from Reference 1',
    imageCount: 1,
  });

  assert.match(
    prompt,
    /Use @Video1 for motion, choreography, poses, camera, framing, timing/
  );
  assert.match(
    prompt,
    /Apply other reference-defined changes only as instructed/
  );
  assert.match(prompt, /Move the whole fight into the forest/);
  assert.match(
    prompt,
    /For partial edits \(clothing, props, objects, background, style\)/
  );
  assert.doesNotMatch(prompt, /replacement character/);
  assert.doesNotMatch(prompt, /Preserve the original environment/);
});

test('motion transfer supports character plus location references', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt:
      'Use Reference 1 for the fighter and Reference 2 for the location',
    imageCount: 2,
  });

  assert.match(prompt, /Reference 1 = @Image1/);
  assert.match(prompt, /Reference 2 = @Image2/);
  assert.match(
    prompt,
    /When a reference defines the performer, animate that reference subject/
  );
  assert.match(prompt, /Do not blend traits between unrelated references/);
  assert.match(prompt, /Use Reference 1 for the fighter/);
});

test('motion transfer multi-reference prompt allows multiple views of one element', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt:
      'Use References 1, 2, and 3 as different views of the same squirrel',
    imageCount: 3,
  });

  assert.match(prompt, /Reference 3 = @Image3/);
  assert.match(
    prompt,
    /multiple references may be different subjects or multiple views of one subject/
  );
  assert.doesNotMatch(
    prompt,
    /Do not assume they are alternate views of the same subject/
  );
});

test('motion transfer without a prompt stays conservative and role-neutral', () => {
  const single = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    imageCount: 1,
  });
  const multi = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    imageCount: 2,
  });

  assert.match(single, /If a clear visual correspondence exists/);
  assert.match(single, /Otherwise preserve the source appearance/);
  assert.match(
    single,
    /preserving motion, camera, timing, framing, and shot progression/
  );
  assert.match(multi, /Infer reference roles conservatively/);
  assert.doesNotMatch(single, /primary appearance transformation/);
  assert.doesNotMatch(single, /replacement character/);
});

test('custom provider reference tokens are preserved', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the bottle',
    imageCount: 2,
    references: {
      video: '<video_ref_1>',
      images: ['<image_ref_1>', '<image_ref_2>'],
    },
  });

  assert.match(prompt, /Edit <video_ref_1> by replacing only the targets/);
  assert.match(prompt, /Reference 1 = <image_ref_1>/);
  assert.match(prompt, /Reference 2 = <image_ref_2>/);
  assert.doesNotMatch(prompt, /@Video1/);
});

test('wavespeed-style spaced reference tokens are preserved', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Use Reference 1 for the dancer',
    imageCount: 1,
    references: {
      video: '@Video 1',
      images: ['@Image 1'],
    },
  });

  assert.match(prompt, /Use @Video 1 for motion/);
  assert.match(prompt, /Reference 1 maps to @Image 1/);
  assert.doesNotMatch(prompt, /@Video1\b/);
  assert.doesNotMatch(prompt, /@Image1\b/);
});

test('volcengine-style ark reference tokens are preserved', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the bottle with Reference 1',
    imageCount: 1,
    references: {
      video: '@视频1',
      images: ['@图像1'],
    },
  });

  assert.match(prompt, /Edit @视频1 by replacing only the targets/);
  assert.match(prompt, /Reference 1 maps to @图像1/);
});

test('final prompt length stays at or under baseline for single-image object swap', () => {
  const person = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the person with Reference 1.',
    imageCount: 1,
  });
  const noPrompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    imageCount: 1,
  });

  assert.ok(
    person.length <= BASELINE_PROMPT_LENGTHS.objectsSwapPerson,
    `objects-swap person ${person.length} > baseline ${BASELINE_PROMPT_LENGTHS.objectsSwapPerson}`
  );
  assert.ok(
    noPrompt.length <= BASELINE_PROMPT_LENGTHS.objectsSwapNoPrompt,
    `objects-swap no-prompt ${noPrompt.length} > baseline ${BASELINE_PROMPT_LENGTHS.objectsSwapNoPrompt}`
  );
});

test('Say It Right Dance final prompt stays at or under baseline and has no identity conflicts', () => {
  assert.ok(
    SAY_IT_RIGHT_PROMPT.length > 0,
    'Say It Right template prompt missing'
  );

  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: SAY_IT_RIGHT_PROMPT,
    imageCount: 1,
  });

  assert.ok(
    prompt.length <= BASELINE_PROMPT_LENGTHS.objectsSwapSayItRight,
    `Say It Right final prompt ${prompt.length} > baseline ${BASELINE_PROMPT_LENGTHS.objectsSwapSayItRight}`
  );

  // Template already asserts complete person replacement; system rules must agree.
  assert.match(SAY_IT_RIGHT_PROMPT, /COMPLETE PERSON REPLACEMENT/);
  assert.match(SAY_IT_RIGHT_PROMPT, /IDENTITY PRIORITY/);
  assert.match(prompt, /REFERENCE IDENTITY:/);
  assert.match(prompt, /authoritative identity/);
  assert.match(
    prompt,
    /Do not retain or blend the source performer's identity/
  );

  // Conflict checks: system must not weaken a full-person swap into a soft reference.
  assert.doesNotMatch(prompt, /as a visual reference according to/);
  assert.doesNotMatch(prompt, /Otherwise preserve the source appearance/);
  assert.doesNotMatch(
    prompt,
    /preserve the original (dancer|performer)'s identity/i
  );
});

test('motion transfer length growth is bounded to the shared identity block', () => {
  const dance = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Make the person from Reference 1 dance.',
    imageCount: 1,
  });
  const noPrompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    imageCount: 1,
  });

  const identityOverhead = SEEDANCE_REFERENCE_IDENTITY_RULES.length + 1; // + newline join
  assert.ok(
    dance.length - BASELINE_PROMPT_LENGTHS.motionTransferDance <=
      identityOverhead + 120,
    `motion-transfer dance grew by ${dance.length - BASELINE_PROMPT_LENGTHS.motionTransferDance}, expected ~identity overhead`
  );
  assert.ok(
    noPrompt.length - BASELINE_PROMPT_LENGTHS.motionTransferNoPrompt <=
      identityOverhead + 120,
    `motion-transfer no-prompt grew by ${noPrompt.length - BASELINE_PROMPT_LENGTHS.motionTransferNoPrompt}`
  );
  assert.match(dance, /REFERENCE IDENTITY:/);
});

test('documents multi-image object-swap length vs baseline', () => {
  const multi = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace A with Reference 1 and B with Reference 2',
    imageCount: 2,
  });

  // Multi-image pays for the shared identity block; keep growth under that block.
  assert.ok(
    multi.length - BASELINE_PROMPT_LENGTHS.objectsSwapMulti <=
      SEEDANCE_REFERENCE_IDENTITY_RULES.length + 40,
    `objects-swap multi grew by ${multi.length - BASELINE_PROMPT_LENGTHS.objectsSwapMulti}`
  );
});

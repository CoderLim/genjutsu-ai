import {
  isFieldValueValid,
  type GeneratorModel,
  type WorkflowSpec,
} from './types';

/**
 * Fail fast for malformed model declarations, before enabling a provider.
 * The runtime request validator remains the security boundary.
 */
export function assertGeneratorModelConfig(model: GeneratorModel): void {
  if (!model.id.trim() || !model.name.trim()) throw new Error('Missing model ID/name');
  if (!model.workflows[model.defaultWorkflow]) {
    throw new Error('Missing default workflow: ' + model.id);
  }
  if (!model.pricing.version.trim()) throw new Error('Missing pricing version');

  for (const [workflow, spec] of Object.entries(model.workflows)) {
    if (!spec) continue;
    validateWorkflow(model.id, workflow, spec);

    if (model.pricing.rule.kind === 'per-second') {
      assertRateCoverage(model, spec, 'resolution', model.pricing.rule.rates);
      if (!spec.fields.duration) {
        throw new Error('Per-second model lacks duration: ' + model.id);
      }
    }
    if (model.pricing.rule.kind === 'per-image') {
      const key = spec.fields.resolution ? 'resolution' : 'quality';
      assertRateCoverage(model, spec, key, model.pricing.rule.rates);
    }
    if (model.pricing.rule.kind === 'matrix') {
      for (const field of model.pricing.rule.fields) {
        if (!spec.fields[field]) throw new Error('Missing matrix field: ' + field);
      }
    }
  }
}

function validateWorkflow(modelId: string, workflow: string, spec: WorkflowSpec) {
  if (!spec.label.trim()) throw new Error('Missing workflow label: ' + workflow);

  for (const [name, field] of Object.entries(spec.fields)) {
    if (!isFieldValueValid(field.default, field)) {
      throw new Error('Invalid default for ' + modelId + '/' + workflow + '/' + name);
    }
    if (field.options && field.options.length === 0) {
      throw new Error('Empty field options: ' + name);
    }
  }

  for (const [slot, rule] of Object.entries(spec.slots)) {
    if (!rule) continue;
    if (!Number.isInteger(rule.min) || !Number.isInteger(rule.max) ||
        rule.min < 0 || rule.max < rule.min) {
      throw new Error('Invalid media slot bounds: ' + modelId + '/' + slot);
    }
    if (rule.max > 0 && rule.accept.length === 0) {
      throw new Error('Missing upload MIME types: ' + slot);
    }
    if ((slot === 'startFrame' || slot === 'endFrame') && rule.max > 1) {
      throw new Error('Frame slots only accept one image');
    }
  }

  for (const constraint of spec.constraints ?? []) {
    const source = spec.fields[constraint.when.field];
    const target = spec.fields[constraint.field];
    if (!source || !target || !isFieldValueValid(constraint.when.equals, source)) {
      throw new Error('Unknown constraint field: ' + constraint.field);
    }
    if (
      constraint.allowedValues.length === 0 ||
      constraint.allowedValues.some((value) => !isFieldValueValid(value, target))
    ) {
      throw new Error('Invalid constraint values: ' + constraint.field);
    }
  }
}

function assertRateCoverage(
  model: GeneratorModel,
  spec: WorkflowSpec,
  fieldName: string,
  rates: Record<string, number>
) {
  const field = spec.fields[fieldName];
  if (!field?.options?.length) {
    throw new Error('Rate field missing options: ' + model.id + '/' + fieldName);
  }
  for (const option of field.options) {
    const rate = rates[String(option)];
    if (rate === undefined || !Number.isFinite(rate) || rate <= 0) {
      throw new Error('Missing price for ' + model.id + '/' + fieldName + '=' + option);
    }
  }
}

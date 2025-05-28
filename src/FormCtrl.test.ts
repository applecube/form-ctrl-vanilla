import { FormCtrl } from './FormCtrl.js';
import type { FormId } from './types.js';

const createComplexValues = () => {
  return { prop1: 5, prop2: 'asd', prop3: ['a', 'b', 'c'] };
};

const createComplexForm = (id: FormId) => {
  return new FormCtrl(id, {
    values: createComplexValues(),
    requiredMessage: 'Required field',
    requiredValidate: (v: unknown) => Boolean(v),
    validationEventName: 'onBlur',
    validation: {
      prop1: {
        eventName: 'onTouch',
        required: true,
        rules: [
          {
            type: 'error',
            message: 'More than 4',
            validate: (v) => Number.isInteger(v) && (v as number) > 4,
          },
        ],
      },
    },
  });
};

describe('FormCtrl', () => {
  test('create, destroy', () => {
    const form = createComplexForm('form_1');
    expect(FormCtrl.get('form_1')).toBe(form);
    expect(form.destroy()).toBe(true);
    expect(FormCtrl.get('form_1')).toBe(undefined);
  });

  test('values', () => {});
});

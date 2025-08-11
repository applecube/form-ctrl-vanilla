import { FormCtrl } from './class.js';
import type {
  FormFieldMessage,
  FormFieldValidation,
  FormFieldValidationRule,
  FormId,
  FormOptions,
  FormValidation,
  FormValues,
} from './types.js';

const createComplexValues = (): FormValues => {
  return { prop1: 5, prop2: 'asd', prop3: ['a', 'b', 'c'] };
};

const prop1Validate1 = (v: unknown) => Number.isInteger(v) && (v as number) > 4;
const prop1Validate2 = (v: unknown) => Number.isInteger(v) && (v as number) > 7;

const createComplexValidation = (): FormValidation => {
  return {
    prop1: {
      eventName: 'onTouch',
      required: true,
      rules: [
        {
          type: 'error',
          typeIfPassed: 'success',
          message: 'More than 4',
          validate: prop1Validate1,
        },
        {
          type: 'warning',
          message: 'More than 7',
          validate: prop1Validate2,
        },
      ],
    },
  };
};

const createComplexForm = (id: FormId) => {
  return new FormCtrl(id, {
    values: createComplexValues(),
    requiredMessage: 'Required field',
    requiredValidate: (v: unknown) => Boolean(v),
    validationEventName: 'onBlur',
    validation: createComplexValidation(),
  });
};

// region Base

describe('Base', () => {
  test('create, get', () => {
    const form = createComplexForm('form_1');
    expect(FormCtrl.get('form_1')).toBe(form);
  });

  test('destroy', () => {
    const form = createComplexForm('form_1');
    expect(form.destroy()).toBe(true);
    expect(FormCtrl.get('form_1')).toBe(undefined);
  });

  test('keys, destroyAll', () => {
    FormCtrl.destroyAll();
    createComplexForm('form_a');
    createComplexForm('form_b');
    createComplexForm('form_c');
    expect(FormCtrl.keys()).toStrictEqual(['form_a', 'form_b', 'form_c']);
  });
});

// region Values

describe('Values', () => {
  const form = createComplexForm('form_2');
  const valuesCopy = createComplexValues();

  test('get value(s)', () => {
    expect(form.getValues()).toStrictEqual(valuesCopy);
    expect(form.getValue('prop1')).toBe(valuesCopy['prop1']);
  });

  test('set value(s)', () => {
    form.setValue('prop1', 2);
    expect(form.getValue('prop1')).toBe(2);
    valuesCopy['prop1'] = 2;

    const addValues = { prop4: 'vvv', prop5: { a: 4 } };
    form.setValues(addValues);

    expect(form.getValues()).toStrictEqual({ ...valuesCopy, ...addValues });
  });

  test('reset values', () => {
    const newValues = { prop7: 9 };
    form.resetValues(newValues);
    expect(form.getValues()).toStrictEqual(newValues);
  });

  test('clear values', () => {
    form.clearValues();
    expect(form.getValues()).toStrictEqual({});
  });

  test('get partial values', () => {
    form.clearValues();
    expect(form.getValues(['prop1'])).toStrictEqual({ prop1: undefined });

    form.setValues({ prop1: 2, prop2: 'sdg', prop3: [2, 4], prop4: {} });
    expect(form.getValues(['prop2', 'prop3'])).toStrictEqual({ prop2: 'sdg', prop3: [2, 4] });
  });
});

// region State

describe('State', () => {
  const clearedFieldState = {
    touched: 0,
    changed: 0,
    blurred: 0,
  };

  const changeValues = (form: FormCtrl) => {
    form.setValue('prop1', 4);
    form.setValue('prop1', 4, { byUser: true });
    form.setValue('prop2', 'dfg', { byUser: true });
  };

  const prop1StateAfterValuesChange = {
    touched: 1,
    changed: 2,
    blurred: 0,
    error: true,
    warning: true,
    messages: [
      { type: 'error', message: 'More than 4' },
      { type: 'warning', message: 'More than 7' },
    ],
  };

  test('form options', () => {
    const form = createComplexForm('form_options');

    const defaultOptions: FormOptions = {
      requiredMessage: 'Required field',
      requiredValidate: form.options.requiredValidate,
      validationEventName: 'onBlur',
    };

    expect(form.options).toStrictEqual(defaultOptions);

    form.options = { validationEventName: 'all' };
    expect(form.options).toStrictEqual({ ...defaultOptions, validationEventName: 'all' });
    form.options = defaultOptions;
  });

  test('form state params', () => {
    const form = createComplexForm('form_state_params');

    changeValues(form);

    expect(form.changed).toBe(3);
    expect(form.touched).toBe(2);
    expect(form.hasErrors).toBe(true);
    expect(form.hasWarnings).toBe(true);
  });

  test('field state: get, clear', () => {
    const form = createComplexForm('form_field_state');
    expect(form.getFieldState('prop1')).toStrictEqual(clearedFieldState);

    changeValues(form);
    expect(form.getFieldState('prop1')).toStrictEqual(prop1StateAfterValuesChange);
    expect(form.getFieldData('prop1')).toStrictEqual({ ...prop1StateAfterValuesChange, value: 4 });

    form.clearFieldState('prop1');
    expect(form.getFieldState('prop1')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop2')).not.toStrictEqual(clearedFieldState);

    expect(form.getFieldData('prop1')).toStrictEqual({ ...clearedFieldState, value: 4 });
  });

  test('field messages', () => {
    const form = createComplexForm('form_field_state_messages');

    const addMsg: FormFieldMessage = { type: 'success', message: 'Success' };
    const addMsgs: FormFieldMessage[] = [
      { type: 'success', message: 'Success' },
      { type: 'info', message: 'Info' },
    ];

    changeValues(form);

    form.addFieldMessages('prop1', addMsg);
    form.addFieldMessages('prop1', addMsgs);

    expect(form.getFieldState('prop1')).toStrictEqual({
      ...prop1StateAfterValuesChange,
      messages: [...prop1StateAfterValuesChange.messages, addMsg, ...addMsgs],
    });

    form.resetFieldMessages('prop1', addMsg);

    expect(form.getFieldState('prop1')).toStrictEqual({
      ...prop1StateAfterValuesChange,
      error: false,
      warning: false,
      messages: [addMsg],
    });

    form.clearFieldMessages('prop1');

    expect(form.getFieldState('prop1')).toStrictEqual({
      ...prop1StateAfterValuesChange,
      error: false,
      warning: false,
      messages: [],
    });

    expect(form.hasErrors).toBe(false);
    expect(form.hasWarnings).toBe(false);
  });

  test('form clear, reset', () => {
    const form = createComplexForm('form_clear_reset');

    changeValues(form);
    form.clearState();

    expect(form.touched).toBe(0);
    expect(form.changed).toBe(0);
    expect(form.hasErrors).toBe(false);
    expect(form.hasWarnings).toBe(false);
    expect(form.getFieldState('prop1')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop2')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop3')).toStrictEqual(clearedFieldState);

    form.clear(true);
    expect(form.getFieldValidation('prop1')).toBe(undefined);
    expect(form.getFieldValidation('prop2')).toBe(undefined);
    expect(form.getFieldValidation('prop3')).toBe(undefined);

    form.setFieldValidation('prop1', { required: true });
    form.reset({ prop1: 10 }, { prop1: { required: false } });
    expect(form.getValues()).toStrictEqual({ prop1: 10 });
    expect(form.getFieldValidation('prop1')).toStrictEqual({ required: false });
  });
});

// region DOM

describe('DOM', () => {
  const form = createComplexForm('form_4');

  test('handleChange', () => {
    form.setValue('checkbox_field', false);
    form.handleChange('checkbox_field', {
      target: { type: 'checkbox', checked: true, value: 'on' },
    });
    form.handleChange('prop1', { target: { value: 8 } });

    expect(form.getValues()).toStrictEqual({
      ...createComplexValues(),
      prop1: 8,
      checkbox_field: true,
    });

    expect(form.changed).toBe(3);
    expect(form.touched).toBe(2);
  });

  test('handleBlur', () => {
    form.clearState();
    form.handleBlur('prop1');

    expect(form.getFieldState('prop1')).toStrictEqual({
      changed: 0,
      touched: 0,
      blurred: 1,
      error: false,
      warning: false,
      messages: [],
    });
  });
});

// region Validation options

describe('Validation options', () => {
  const form = createComplexForm('form_5');

  const prop1Validation = createComplexValidation()['prop1'] as FormFieldValidation;
  const prop1Rules = prop1Validation.rules as FormFieldValidationRule[];

  test('field validation: get', () => {
    expect(form.getFieldValidation('prop1')).toStrictEqual(prop1Validation);
    expect(form.getFieldValidation('prop2')).toBe(undefined);
  });

  test('field validation: ensure, clear', () => {
    expect(form.clearFieldValidation('prop1')).toBe(true);
    expect(form.getFieldValidation('prop1')).toBe(undefined);

    expect(form.ensureFieldValidation('prop1')).toStrictEqual({});
    expect(form.getFieldValidation('prop1')).toStrictEqual({});
    expect(form.clearFieldValidation('prop1')).toBe(true);
  });

  test('field validation: add rules', () => {
    form.clearFieldValidation('prop1');
    form.addFieldValidationRules('prop1', prop1Rules);
    expect(form.getFieldValidation('prop1')).toStrictEqual({
      rules: prop1Rules,
    });
  });

  test('field validation: set, reset', () => {
    form.clearFieldValidation('prop1');
    form.addFieldValidationRules('prop1', prop1Rules);

    const addProp1Validation: FormFieldValidation = {
      required: true,
      eventName: 'onBlur',
    };

    form.setFieldValidation('prop1', addProp1Validation);
    expect(form.getFieldValidation('prop1')).toStrictEqual({
      rules: prop1Rules,
      ...addProp1Validation,
    });

    form.resetFieldValidation('prop1', addProp1Validation);
    expect(form.getFieldValidation('prop1')).toStrictEqual(addProp1Validation);
  });
});

// region Validate

describe('Validate', () => {
  const form = createComplexForm('form_6');

  test('validate with no validation event', () => {
    expect(form.validate('prop1', 'onBlur')).toBe(true);
  });

  test('validate with existing validation event', () => {
    expect(form.validate('prop1', 'onTouch')).toBe(false);
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      { type: 'success', message: 'More than 4' },
      { type: 'warning', message: 'More than 7' },
    ]);
  });

  test('validate with default setValue validation event onChange', () => {
    form.setValue('prop1', 8);
    expect(form.getFieldState('prop1').messages).toStrictEqual([]);
  });

  test('validate with default handleChange validation event onTouch', () => {
    form.handleChange('prop1', { target: { value: 2 } });
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      { type: 'error', message: 'More than 4' },
      { type: 'warning', message: 'More than 7' },
    ]);
  });

  test('promisified validate', async () => {
    form.resetValidation({
      prop2: {
        rules: [
          {
            message: 'Length less than 5',
            validate: (val: string) => Promise.resolve(val.length < 5),
          },
        ],
      },
    });

    const result = form.validate();

    expect(result instanceof Promise).toBe(true);
    await expect(result).resolves.toBe(true);
  });
});

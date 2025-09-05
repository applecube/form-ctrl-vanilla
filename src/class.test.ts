import { FormCtrl } from './class.js';
import type {
  FormField,
  FormFieldMessage,
  FormFieldState,
  FormFieldValidate,
  FormFieldValidation,
  FormFieldValidationRule,
  FormId,
  FormOptions,
  FormValidation,
} from './types.js';

interface TestFormValues {
  prop1: number;
  prop2: string;
  prop3: string[];
  prop4: Record<string, any>;
  prop5: Record<string, any>[];
}

const createComplexValues = (): TestFormValues => {
  return {
    prop1: 5,
    prop2: 'asd',
    prop3: ['a', 'b', 'c'],
    prop4: { a: 3, b: 'sdf' },
    prop5: [{ a: 4 }, { a: 3, b: 5 }, { c: 'asd' }],
  };
};

const prop1Validate1: FormFieldValidate<TestFormValues, 'prop1'> = (v) => v > 4;
const prop1Validate2: FormFieldValidate<TestFormValues, 'prop1'> = (v) => v > 7;
const prop1Validate3: FormFieldValidate<TestFormValues, 'prop1'> = (v, fv) =>
  v > 10 && !!fv?.prop2.length && fv?.prop2.length > 4;

const prop3Validate1: FormFieldValidate<TestFormValues, 'prop3'> = (v) => v[2] === 'c';

const prop5Validate1: FormFieldValidate<TestFormValues, 'prop5'> = (v) => v[2]?.b === 5;

const createComplexValidation = (): FormValidation<TestFormValues> => {
  return {
    prop1: {
      eventName: 'onTouch',
      required: true,
      rules: [
        {
          type: 'error',
          typeIfPassed: 'success',
          message: 'msg11',
          validate: prop1Validate1,
        },
        {
          type: 'warning',
          message: 'msg12',
          validate: prop1Validate2,
        },
        {
          message: 'msg13',
          validate: prop1Validate3,
          needMoreValues: ['prop2', 'prop3'],
          eventName: 'onBlur',
        },
      ],
    },
    prop3: {
      rules: [
        {
          type: 'info',
          message: 'msg31',
          validate: prop3Validate1,
          eventName: 'all',
        },
        {
          type: 'error',
          message: 'msg32',
          validate: prop3Validate1,
          eventName: 'onChange',
        },
      ],
    },
    prop5: {
      rules: [
        {
          type: 'error',
          message: 'msg51',
          validate: prop5Validate1,
        },
      ],
    },
  };
};

const createComplexForm = (id: FormId = 'complex_id') => {
  return new FormCtrl(id, {
    values: createComplexValues(),
    requiredMessage: 'Required field',
    requiredValidate: (v: unknown) => Boolean(v),
    validationEventName: 'onBlur',
    validation: createComplexValidation(),
  });
};

// region Base

describe('Create/destroy + static', () => {
  test('create, get', () => {
    const form = new FormCtrl('form_1');
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
  FormCtrl.destroyAll();
  const form = createComplexForm();
  const valuesCopy = createComplexValues();

  test('get value(s)', () => {
    expect(form.getValues()).toStrictEqual(valuesCopy);
    expect(form.getValue('prop1')).toBe(valuesCopy['prop1']);
  });

  test('set value(s)', () => {
    form.setValue('prop1', 2);
    expect(form.getValue('prop1')).toBe(2);
    valuesCopy['prop1'] = 2;

    const addValues: Partial<TestFormValues> = { prop4: { a: 4 }, prop5: [{ a: 3 }] };
    form.setValues(addValues);

    expect(form.getValues()).toStrictEqual({ ...valuesCopy, ...addValues });
  });

  test('reset values', () => {
    const newValues: TestFormValues = { prop1: 1, prop2: '', prop3: [], prop4: {}, prop5: [{}] };
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

    form.setValues({ prop1: 2, prop2: 'sdg', prop3: ['q', 'w'], prop4: {} });
    expect(form.getValues(['prop2', 'prop3'])).toStrictEqual({ prop2: 'sdg', prop3: ['q', 'w'] });
  });
});

// region State

describe('State', () => {
  FormCtrl.destroyAll();

  const clearedFieldState: FormFieldState = {
    touched: 0,
    changed: 0,
    blurred: 0,
    error: false,
    warning: false,
    messages: null,
  };

  const changeValues = (form: FormCtrl<TestFormValues>) => {
    form.setValue('prop1', 4);
    form.setValue('prop1', 4, { byUser: true });
    form.setValue('prop2', 'dfg', { byUser: true });
    form.handleBlur('prop2');
    form.setValue('prop3', ['a', 'b', 'd']);
    form.setValues({ prop4: { a: 5 }, prop5: [{ a: 5 }] });
    form.handleBlur('prop5');
  };

  const prop1StateAfterValuesChange = {
    touched: 1,
    changed: 2,
    blurred: 0,
    error: true,
    warning: true,
    messages: [
      { type: 'error', message: 'msg11' },
      { type: 'warning', message: 'msg12' },
    ],
  } satisfies FormFieldState;

  const prop2StateAfterValuesChange = {
    touched: 1,
    changed: 1,
    blurred: 1,
    error: false,
    warning: false,
    messages: null,
  } satisfies FormFieldState;

  const prop3StateAfterValuesChange = {
    touched: 0,
    changed: 1,
    blurred: 0,
    error: true,
    warning: false,
    messages: [
      {
        message: 'msg31',
        type: 'info',
      },
      {
        message: 'msg32',
        type: 'error',
      },
    ],
  } satisfies FormFieldState;

  const prop4StateAfterValuesChange = {
    touched: 0,
    changed: 1,
    blurred: 0,
    error: false,
    warning: false,
    messages: null,
  } satisfies FormFieldState;

  const prop5StateAfterValuesChange = {
    touched: 0,
    changed: 1,
    blurred: 1,
    error: true,
    warning: false,
    messages: [
      {
        type: 'error',
        message: 'msg51',
      },
    ],
  } satisfies FormFieldState;

  test('form options', () => {
    const form = createComplexForm('form_options');

    const defaultOptions: FormOptions<TestFormValues> = {
      requiredMessage: 'Required field',
      requiredValidate: form.options.requiredValidate,
      validationEventName: 'onBlur',
    };

    expect(form.options).toStrictEqual(defaultOptions);

    form.options = { validationEventName: 'all' };
    expect(form.options).toStrictEqual({ validationEventName: 'all' });
    form.options = defaultOptions;
  });

  test('form state params', () => {
    const form = createComplexForm('form_state_params');

    changeValues(form);

    expect(form.changed).toBe(6);
    expect(form.touched).toBe(2);
    expect(form.blurred).toBe(2);
    expect(form.hasErrors).toBe(true);
    expect(form.hasWarnings).toBe(true);
  });

  test('field state: get, clear', () => {
    const form = createComplexForm('form_field_state');
    expect(form.getFieldState('prop1')).toStrictEqual(clearedFieldState);

    changeValues(form);
    expect(form.getFieldState('prop1')).toStrictEqual(prop1StateAfterValuesChange);
    expect(form.getFieldState('prop2')).toStrictEqual(prop2StateAfterValuesChange);
    expect(form.getFieldState('prop3')).toStrictEqual(prop3StateAfterValuesChange);
    expect(form.getFieldState('prop4')).toStrictEqual(prop4StateAfterValuesChange);
    expect(form.getFieldState('prop5')).toStrictEqual(prop5StateAfterValuesChange);
    expect(form.getFieldState('prop6' as any)).toStrictEqual(clearedFieldState);

    form.clearFieldState('prop1');
    form.clearFieldState('prop4');
    expect(form.getFieldState('prop1')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop2')).toStrictEqual(prop2StateAfterValuesChange);
    expect(form.getFieldState('prop3')).toStrictEqual(prop3StateAfterValuesChange);
    expect(form.getFieldState('prop4')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop5')).toStrictEqual(prop5StateAfterValuesChange);
    expect(form.getFieldState('prop6' as any)).toStrictEqual(clearedFieldState);
  });

  test('field messages', () => {
    const form = createComplexForm('form_field_state_messages');

    const addMsg: FormFieldMessage = { type: 'success', message: 'Success' };
    const addMsgs: FormFieldMessage[] = [
      { type: 'success', message: 'Success' },
      { type: 'info', message: 'Info' },
    ];

    changeValues(form);

    form.addFieldCustomMessages('prop1', [addMsg]);
    form.addFieldCustomMessages('prop1', addMsgs);

    expect(form.getFieldState('prop1')).toStrictEqual({
      ...prop1StateAfterValuesChange,
      messages: [...prop1StateAfterValuesChange.messages, addMsg, ...addMsgs],
    });

    form.clearFieldValidationMessages('prop1');

    expect(form.getFieldState('prop1').error).toBe(false);
    expect(form.getFieldState('prop1').warning).toBe(false);
    expect(form.getFieldState('prop1').messages).toStrictEqual([addMsg, ...addMsgs]);

    form.resetFieldCustomMessages('prop1', [...addMsgs]);
    expect(form.getFieldState('prop1').messages).toStrictEqual([...addMsgs]);

    form.clearFieldCustomMessages('prop1');
    expect(form.getFieldState('prop1').error).toBe(false);
    expect(form.getFieldState('prop1').warning).toBe(false);
    expect(form.getFieldState('prop1').messages).toBe(null);
    expect(form.hasErrors).toBe(true);
    expect(form.hasWarnings).toBe(false);

    form.clearFieldState('prop1');

    changeValues(form);
    expect(form.getFieldState('prop1')).toStrictEqual(prop1StateAfterValuesChange);

    form.clearFieldMessages('prop1');
    expect(form.getFieldState('prop1').error).toBe(false);
    expect(form.getFieldState('prop1').warning).toBe(false);
    expect(form.getFieldState('prop1').messages).toBe(null);

    changeValues(form);

    form.addFieldCustomMessages('prop1', [addMsg]);
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      ...prop1StateAfterValuesChange.messages,
      addMsg,
    ]);

    form.resetFieldCustomMessages('prop1', [...addMsgs]);
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      ...prop1StateAfterValuesChange.messages,
      ...addMsgs,
    ]);
  });

  test('multiple values change with same validation result preserves messages', () => {
    const form = createComplexForm();

    changeValues(form);
    changeValues(form);
    changeValues(form);
    expect(form.getFieldState('prop1').messages).toStrictEqual(
      prop1StateAfterValuesChange.messages,
    );
  });

  test('changing validation settings clears validation messages, except addFieldValidationRules', () => {
    const form = createComplexForm();
    changeValues(form);

    form.resetFieldValidation('prop1', { required: true });
    expect(form.getFieldState('prop1').messages).toBe(null);

    changeValues(form);
    form.setFieldValidation('prop1', { required: false });
    expect(form.getFieldState('prop1').messages).toBe(null);

    form.setFieldValidation('prop1', createComplexValidation().prop1!);
    changeValues(form);
    form.addFieldValidationRules('prop1', [
      { validate: (v) => v === 0, message: 'added_rule_msg' },
    ]);
    expect(form.getFieldState('prop1').messages).toStrictEqual(
      prop1StateAfterValuesChange.messages,
    );
    expect(form.getFieldState('prop2').messages).toBe(null);
    expect(form.getFieldState('prop3').messages).toStrictEqual(
      prop3StateAfterValuesChange.messages,
    );
    expect(form.getFieldState('prop4').messages).toBe(null);
    expect(form.getFieldState('prop5').messages).toStrictEqual(
      prop5StateAfterValuesChange.messages,
    );
  });

  test('force error, warning', () => {
    const form = createComplexForm('force_error_warning');

    changeValues(form);
    expect(form.getFieldState('prop1').error).toBe(true);
    expect(form.getFieldState('prop1').warning).toBe(true);

    form.forceFieldError('prop1', false);
    expect(form.getFieldState('prop1').error).toBe(false);

    form.forceFieldWarning('prop1', false);
    expect(form.getFieldState('prop1').warning).toBe(false);

    changeValues(form);
    changeValues(form);
    changeValues(form);
    expect(form.getFieldState('prop1').error).toBe(false);
    expect(form.getFieldState('prop1').warning).toBe(false);

    form.unforceFieldError('prop1');
    expect(form.getFieldState('prop1').error).toBe(true);

    form.unforceFieldWarning('prop1');
    expect(form.getFieldState('prop1').warning).toBe(true);
  });

  test('form clear, reset', () => {
    const form = createComplexForm('form_clear_reset');

    changeValues(form);
    form.clearState();

    expect(form.touched).toBe(0);
    expect(form.changed).toBe(0);
    expect(form.blurred).toBe(0);
    expect(form.hasErrors).toBe(false);
    expect(form.hasWarnings).toBe(false);
    expect(form.getFieldState('prop1')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop2')).toStrictEqual(clearedFieldState);
    expect(form.getFieldState('prop3')).toStrictEqual(clearedFieldState);

    form.clear();
    expect(form.getValues()).toStrictEqual({});

    form.clearValidation();
    expect(form.getFieldValidation('prop1')).toBe(undefined);
    expect(form.getFieldValidation('prop2')).toBe(undefined);
    expect(form.getFieldValidation('prop3')).toBe(undefined);

    form.setValues(createComplexValues());

    const newValues = { ...createComplexValues(), prop2: '1001001' };
    form.reset(newValues);
    expect(form.getValues()).not.toBe(newValues);
    expect(form.getValues()).toStrictEqual(newValues);
  });
});

// region DOM

describe('DOM', () => {
  FormCtrl.destroyAll();
  const form = new FormCtrl('dom_form');

  const createInput = (inputType: string, field: FormField) => {
    const inputEl = document.createElement('input');
    inputEl.type = inputType;
    inputEl.addEventListener('input', (e) => form.handleInput(field, e));
    inputEl.addEventListener('blur', () => form.handleBlur(field));
    document.body.appendChild(inputEl);

    return {
      field,
      el: inputEl,
      blur: () => {
        inputEl.focus();
        inputEl.blur();
      },
      input: (value: any) => {
        inputEl.value = value;
        if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
          inputEl.checked = value === 'on' ? true : false;
        }
        inputEl.dispatchEvent(
          new InputEvent('input', {
            bubbles: true, // Allows the event to bubble up the DOM tree
            cancelable: true, // Allows the event to be canceled
            composed: true, // Allows the event to propagate across shadow DOM boundaries
          }),
        );
      },
    };
  };

  const itext = createInput('text', 'text_field');
  const ich = createInput('checkbox', 'checkbox_field');
  const idate = createInput('date', 'date_field');
  const inum = createInput('number', 'number_field');

  test('input text', () => {
    itext.input('asd');
    itext.input('asdf');
    itext.input('asdfd');
    itext.input('asdf');
    itext.blur();

    expect(form.getFieldState(itext.field)).toStrictEqual({
      touched: 4,
      changed: 4,
      blurred: 1,
      error: false,
      warning: false,
      messages: null,
    });
    expect(form.getValue(itext.field)).toBe('asdf');
  });

  test('input checkbox', () => {
    form.setFieldValidation(ich.field, {
      rules: [
        {
          message: 'blur1',
          validate: (v) => v === true,
        },
        {
          message: 'change2',
          validate: (v) => v === true,
          eventName: 'onChange',
        },
        {
          message: 'touch3',
          validate: (v) => v === true,
          eventName: 'onTouch',
        },
      ],
    });

    ich.input('on');
    ich.input('off');

    expect(form.getValue(ich.field)).toBe(false);
    expect(form.getFieldState(ich.field)).toStrictEqual({
      touched: 2,
      changed: 2,
      blurred: 0,
      error: true,
      warning: false,
      messages: [
        {
          type: 'error',
          message: 'change2',
        },
        { type: 'error', message: 'touch3' },
      ],
    });

    ich.blur();

    expect(form.getFieldState(ich.field)).toStrictEqual({
      touched: 2,
      changed: 2,
      blurred: 1,
      error: true,
      warning: false,
      messages: [
        { type: 'error', message: 'blur1' },
        {
          type: 'error',
          message: 'change2',
        },
        { type: 'error', message: 'touch3' },
      ],
    });

    ich.input('on');
    ich.blur();

    expect(form.getValue(ich.field)).toBe(true);
    expect(form.getFieldState(ich.field)).toStrictEqual({
      touched: 3,
      changed: 3,
      blurred: 2,
      error: false,
      warning: false,
      messages: null,
    });
  });

  test('input date', () => {
    idate.input('2025-03-20');
    idate.blur();

    expect(form.getValue(idate.field)).toBe('2025-03-20');
    expect(form.getFieldState(idate.field)).toStrictEqual({
      touched: 1,
      changed: 1,
      blurred: 1,
      error: false,
      warning: false,
      messages: null,
    });
  });

  test('input number', () => {
    inum.input('123');
    inum.input('123.1');
    inum.input('123.12');
    inum.blur();

    expect(form.getValue(inum.field)).toBe('123.12');
    expect(form.getFieldState(inum.field)).toStrictEqual({
      touched: 3,
      changed: 3,
      blurred: 1,
      error: false,
      warning: false,
      messages: null,
    });
  });
});

// region Validate

describe('Validate', () => {
  FormCtrl.destroyAll();

  test('validate with no validation event', () => {
    const form = createComplexForm('form_validate');
    expect(form.validateField('prop1', 'onChange')).toBe(true);
  });

  test('validate with existing validation event', () => {
    const form = createComplexForm('form_validate');
    expect(form.validateField('prop1', 'onTouch')).toBe(false);
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      { type: 'success', message: 'msg11' },
      { type: 'warning', message: 'msg12' },
    ]);
  });

  test('validate with default setValue validation event onChange', () => {
    const form = createComplexForm('form_validate');
    form.setValue('prop1', 8);
    expect(form.getFieldState('prop1').messages).toBe(null);
  });

  test('validate with default handleChange validation event onTouch', () => {
    const form = createComplexForm('form_validate');
    form.handleInput('prop1', { target: { value: 2 } });
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      { type: 'error', message: 'msg11' },
      { type: 'warning', message: 'msg12' },
    ]);
  });

  test('validate with validation depending on two fields', () => {
    const form = createComplexForm('form_validate');

    form.setValue('prop1', 11);
    form.validateField('prop1', 'onBlur');
    expect(form.getFieldState('prop1').messages).toStrictEqual([
      { type: 'error', message: 'msg13' },
    ]);

    form.setValue('prop2', 'asdfg');
    form.validateField('prop1', 'onBlur');
    expect(form.getFieldState('prop1').messages).toBe(null);
  });

  test('promisified validate', async () => {
    const form = createComplexForm('form_validate');
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

// region Validation

describe('Validation settings', () => {
  FormCtrl.destroyAll();
  const form = createComplexForm('form_validation_settings');

  const prop1Validation = createComplexValidation()['prop1'] as FormFieldValidation;
  const prop1Rules = prop1Validation.rules as FormFieldValidationRule[];

  test('field validation: get', () => {
    expect(form.getFieldValidation('prop1')).toStrictEqual(prop1Validation);
    expect(form.getFieldValidation('prop2')).toBe(undefined);
  });

  test('field validation: clear, set', () => {
    form.setValue('prop1', 1, { byUser: true });
    expect(form.getFieldState('prop1').messages).not.toBe(null);
    expect(form.clearFieldValidation('prop1')).toBe(true);
    expect(form.getFieldValidation('prop1')).toBe(undefined);
    expect(form.getFieldState('prop1').messages).toBe(null);

    expect(
      form.setFieldValidation('prop1', { eventName: 'onTouch', required: true }),
    ).toStrictEqual({ eventName: 'onTouch', required: true });
    expect(form.getFieldValidation('prop1')).toStrictEqual({
      eventName: 'onTouch',
      required: true,
    });
    form.setValue('prop1', 0, { byUser: true });
    expect(form.getFieldState('prop1').messages).not.toBe(null);
    form.setFieldValidation('prop1', { required: true });
    expect(form.getFieldState('prop1').messages).toBe(null);
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

  test('full validation: get, clear, set, reset', () => {
    let form = createComplexForm('form_full_validation');
    expect(form.getValidation()).toStrictEqual(createComplexValidation());
    expect(form.clearValidation()).toStrictEqual(['prop1', 'prop3', 'prop5']);
    expect(form.getValidation()).toStrictEqual({});

    form = createComplexForm('form_full_validation');
    form.setValidation({ prop1: { required: true }, prop2: { required: true } });
    expect(form.getValidation()).toStrictEqual({
      ...createComplexValidation(),
      prop1: { required: true },
      prop2: { required: true },
    });

    // fields array can be in different order
    expect(form.resetValidation({ prop1: { required: true } })).toEqual(
      expect.arrayContaining(['prop1', 'prop2', 'prop3', 'prop5']),
    );
    expect(form.getValidation()).toStrictEqual({ prop1: { required: true } });
  });
});

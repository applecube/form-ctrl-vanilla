# `form-ctrl-vanilla`

Zero dependency vanilla js form control map for multiple forms with values, state, validation.

## Install

`npm install form-ctrl-vanilla`

## Usage

```js
import { formCtrl } from 'form-ctrl-vanilla';

const form = formCtrl.create('form_id', {
  values: {
    field_1: 5,
    field_2: 'asd',
    field_3: [1, 2, 3],
  },
});

const inputEl = document.getElementById('input_id');
inputEl.addEventListener('input', (e) => form.handleChange('field_1', e));
inputEl.addEventListener('blur', () => form.handleBlur('field_1'));
```

```js
import { formCtrl } from 'form-ctrl-vanilla';

// form instance can be retrieved by id anywhere
const checkFieldTouched = () => {
  return formCtrl('form_id').getFieldState('field_1').touched;
}

const validateIfChanged = () => {
  const form = formCtrl('form_id');
  return form.changed ? form.validate() : true;
}

const setDefaultValues = () => {
  formCtrl('form_id').setValues({
    field_1: 5,
    field_2: 'asd',
    field_3: [1, 2, 3],
  });
}
```

```js
import { formCtrl } from 'form-ctrl-vanilla';

// create form with validation
const form = formCtrl.create('form_id', {
  values: {
    field_1: 5,
    field_2: 'asd',
    field_3: [1, 2, 3],
  },
  validation: {
    field_1: {
      rules: [
        {
          message: 'Must be more than 10',
          type: 'error',
          typeIfPassed: 'success',
          validate: (value) => value > 10,
        },
      ],
    },
    field_3: {
      eventName: 'onBlur',
      required: 'List must be filled',
      requiredValidate: (value) => value.length > 0,
    }
  },
  requiredMessage: 'Required field',
  validationEventName: 'onChange',
});

```

## API

### `formCtrl`

Wrapper around `FormCtrl` class for convenience.

---

#### `formCtrl(id)`

Get `FormCtrl` instance by `id`.
If none found - creates one (at least for type convenience).
For strict `get` use `formCtrl.get(id)`.

#### `formCtrl.create(id, options)`

Create `FormCtrl` instance and register it in internal store by `id`.
Rewrite if there is already one for this `id`.
Same as `new FormCtrl(id, options)`.
Constructor options description is below.

#### `formCtrl.get(id)`

Get `FormCtrl` instance by `id`.
If none found - returns `undefined`.
Same as `FormCtrl.get(id)`.

#### `formCtrl.keys()`

Get array of all `FormCtrl` ids.
Same as `FormCtrl.keys()`.

#### `formCtrl.destroyAll()`

Destroy all current forms (remove from internal store).

---

### `FormCtrl` instance

Each `FormCtrl` instance has id and registers itself in internal Map by this id for later retrieval.
Each instance has its own field values, states, validation, options.

---

#### `options` of FormCtrl instance

`FormCtrl` instance options, used in
- `formCtrl.create(id, options)`
- `new FormCtrl(id, options)`
- `formCtrl(id).options` - getter (cloned) and setter (merge)

#### `options.values`

Initial field values. Same as `form.setValues(values)` right after instance creation, but latter will cause validation trigger and state change.

#### `options.validation`

Object with form field as key and field validation as value.
Schema:

```js
{
  [field]: {
    required: boolean | string | Rule,
    requiredValidate: (value) => boolean | Promise<boolean>,
    eventName: 'onTouch' | 'onChange' | 'onBlur' | 'all',
    rules: [
      {
        message: string,
        type: 'error' | 'warning' | 'success' | 'info',
        typeIfPassed: 'error' | 'warning' | 'success' | 'info',
        needMoreValues: boolean | field[],
        validate: (value, formValues) => boolean | Promise<boolean>,
        eventName: 'onTouch' | 'onChange' | 'onBlur' | 'all',
      },
      Rule,
      Rule,
      ...
    ]
  }
}
```

Every parameter is optional.

`required` is separate validation because the most used one and can have a special ui meaning as asterisk in label.
Usually used as boolean flag.
It has its default simple validate function instance wide,
but can be rewritten with `options.requiredValidate` or validation object `requiredValidate`.
Required message is provided instance wide as `options.requiredMessage` or as a string value of `required` validation parameter.
For detailed `required` configuration - `Rule` object can be passed as `required` validation parameter.

Validation results in field state messages change
(`form.getFieldState('field_1').messages = [{ message, type }, ...]`)
and boolean flag returning
(`form.validate('field_1') => boolean | Promise<boolean>`).
Each validate function is run on specific event (or all of them if `'all'` is passed).
Validation event is taken in this order `rule.eventName || validation.eventName || options.validationEventName`.

Detailed field validation configuration is defined with `Rule` objects in `rules` array.

`Rule.message` will go in `FieldMessage.message` as validation state result if `Rule.validate` failed (returns false)
or if succeded and `Rule.typeIfPassed` provided.

`Rule.type` will go in `FieldMessage.type` if `Rule.validate` failed (returns false).

`Rule.typeIfPassed` should be provided if state message should exist event if `Rule.validate` succeded (returns true), will go in `FieldMessage.type`

`Rule.needMoreValues` controls second argument (formValues) in `Rule.validate` function,
if `true` - all form values passed,
if fields array - object only with these fields passed.
Turned off by default because of potentially rare usage and slight overhead on use.
It is better to provide fields array if only some field values are needed for validation.

`Rule.validate` - function runs on field validation if validation event matches occurred event.

`Rule.eventName` - event on which rule validation will run, overrides `validation.eventName` which overrides `options.validationEventName`

#### `options.validationEventName`

`'onTouch' | 'onChange' | 'onBlur' | 'all'` defaults to `'onBlur'`. Details are above.

#### `options.requiredValidate`

Overrides default validate function for all fields required validation. Details are above.

#### `options.requiredMessage`

Default required failure validation message for all fields. Details are above.

---

#### `id`

ID of `FormCtrl` instance. `formCtrl('some_id').id = 'some_id'`

#### `touched`

Number of times form values have been changed by user.

#### `changed`

Number of times form values have been changed by any means (by user and api calls e.g. `setValue`).

#### `blurred`

Number of times form fields have been blurred (with `handleBlur`).

#### `hasErrors`

Returns `true` if at least one field has error.

#### `hasWarnings`

Returns `true` if at least one field has warning.

#### `getOptions()`

Returns form options.
Should not be changed directly.
Use `setOptions` to change options.

#### `setOptions(formOptions)`

Overrides provided form options.
Returns full form options.

---

#### `clearState()`

Clears all field states.

#### `clear()`

Clears all fields states (messages, error, warning, etc) and values.
Validation settings are not changed.
To clear validation settings use `clearValidation`.

#### `reset(values)`

Clears all fields states (messages, error, warning, etc) and values.
Overrides field values with provided ones.
Validation settings are not changed.
To reset validation settings use `resetValidation`.

#### `destroy()`

Removes form instance from internal store.
Returns `true` if internal store still had this form instance.

---

#### `clearFieldState(field)`

Clears field state.
Messages, error, warning are dropped including custom messages and forced error / warning.
Returns `true` if there was a state for passed field.

#### `getFieldState(field)`

Gets field state.
Creates empty one if none found:

`{ touched: 0, changed: 0, blurred: 0, error: false, warning: false }`

Should not be changed directly.

#### `forceFieldError(field, error)`

Forces permanent field error, no matter validation results change.

To unforce use one of `unforceFieldError`, `clearFieldState`, `clearState`, `clear`, `reset`

#### `forceFieldWarning(field, warning)`

Forces permanent field warning, no matter validation results change.

To unforce use one of `unforceFieldWarning`, `clearFieldState`, `clearState`, `clear`, `reset`

#### `unforceFieldError(field)`

Clears permanent error override and recalculates error based on existing messages.

#### `unforceFieldWarning(field)`

Clears permanent warning override and recalculates warning based on existing messages.

#### `clearFieldMessages(field)`

Clears all field messages (validation and custom), error, warning.

#### `clearFieldValidationMessages(field)`

Clears validation field messages (that can exist only as result of field validation).
Custom field messages are kept intact.

#### `clearFieldCustomMessages(field)`

Clears custom field messages. Validation messages are kept intact.

#### `addFieldCustomMessages(field, messages)`

Adds custom field messages. Previous field messages are kept intact.
These are separate from potential validation messages.

#### `resetFieldCustomMessages(field, messages)`

Clears and adds new custom field messages. Validation messages are kept intact.

---

#### `getValue(field)`

Gets field value.

#### `getValues(fields)`

Gets fields values.
If `fields` provided - returns values only for them.
If not - returns all fields values.

It is better to use `getValues(['a', 'b'])`
than `getValues().a` `getValues().b`
performance wise.

#### `setValue(field, value, valuesSetterOptions)`

Sets field value with validation and other calculations.
Provide `valuesSetterOptions` to control things happening other than setting value (details below).

#### `setValues(values, valuesSetterOptions)`

Sets fields values with validation and other calculations.
`values` is plain object - field name as key, field value as value.
Provide `valuesSetterOptions` to control things happening other than setting values (details below).

#### `clearValues(valuesSetterOptions)`

Clears all fields values with validation and other calculations.
Provide `valuesSetterOptions` to control things happening other than clearing values (details below).

#### `resetValues(values, valuesSetterOptions)`

Clears all previous fields values and sets provided ones.
Validation, state change, rerender happen for previous and new fields combined.
If field was there and provided again above things happen to it once.
Provide `valuesSetterOptions` to control things happening other than resetting values (details below).

#### `valuesSetterOptions` argument

`valuesSetterOptions.byUser` - boolean, if value changed by user,
usually when user enters value in input,
triggers `onTouch` validation,
increments `touched` and `changed` field state, otherwise only `changed` is incremented,
default `false`,
but will be `true` for `handleChange` method optimised for dom change event.

`valuesSetterOptions.skipChangeUpdate` - boolean, skip incrementing `touched` / `changed` / `blurred` state.

`valuesSetterOptions.skipValidation` - skip validation.

---

#### `handleChange(field, event)`

Simple wrapper around `setValue` with `byUser: true`.
Should be used on `input` event of input field.
Form will set value, trigger `onTouch` validation, etc.

`InputEvent` object must be provided as second argument.
Value will be taken from it as `event.target.value` or `event.target.checked` for checkbox input.
Generic `{ target: { value: '...' } }` is acceptable.

Supposed to be used with `handleBlur`.

#### `handleBlur(field)`

Should be used on `blur` event of input field.
Increments `blurred` state and trigger `onBlur` validation.

Supposed to be used with `handleChange`.

---

#### `validateField(field, eventName)`

Triggers field validation for specific event.

Pass `eventName` to trigger only validation specified for that event, default `'all'`.

Returns promise only if encounters promisified validate function.

If any validate function throws an error be it sync or async -
catches error and considers it not passed (as if it returned `false`).

#### `validate(fields, eventName)`

Triggers multiple fields validation for specific event.

If `fields` is not provided - trigger validation for all fields that have validation.

Pass `eventName` to trigger only validation specified for that event, default `'all'`.

Returns promise only if encounters promisified validate function.

If any validate function throws an error be it sync or async -
catches error and considers it not passed (as if it returned `false`).

Triggers all fields rerender after all validation processed.

If validation results in promise - await it and rerender after.

---

#### `getFieldValidation(field)`

Gets field validation settings. Returns `undefined` if there are no settings.

Settings should not be changed directly.

To change settings use `setFieldValidation`, `resetFieldValidation`, `clearFieldValidation`, `addFieldValidationRules`.

#### `addFieldValidationRules(field, rules)`

Ensures field validation settings and adds provided rules to it.
Previous rules, if there were any, are kept intact.

#### `clearFieldValidation(field)`

Clears field validation settings.
Returns `true` if there were settings, `false` otherwise.

#### `setFieldValidation(field, partialFieldValidation)`

Ensures field validation settings and overrides provided params in it.
Rules will be fully overriden.
To add validation rules without full override use `addFieldValidationRules`.
Returns full field validation settings.

#### `resetFieldValidation(field, fieldValidation)`

Overrides field validation settings with provided ones.

#### `getValidation()`

Gets copy of all fields validation settings.

#### `clearValidation()`

Clears all fields validation settings.
Returns fields that had one.

#### `setValidation(someFieldsValidation)`

Overrides validation settings for provided fields.
Other fields validation settings are kept intact.

#### `resetValidation(allFieldsValidation)`

Clears all fields validation settings and sets provided ones.
Returns fields that had one (dropped and overriden).

## Extend

### Implementation for React

**https://github.com/applecube/form-ctrl-react**

**https://www.npmjs.com/package/form-ctrl-react**

### Custom

```js
import { FormCtrl as FormCtrlVanilla } from 'form-ctrl-vanilla/class';

class FormCtrlCustom extends FormCtrlVanilla {
  constructor(formId, options) {
    super(formId, options);
  }

  // this method is used in base class when rerender should happen
  // for example after field value changes
  // or validation results in changed messages
  _rerenderField(field) {
    // trigger rerender
  }
}
```

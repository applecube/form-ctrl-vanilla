# `form-ctrl-vanilla`

Zero dependency vanilla js form control map for multiple forms with values, state, validation.

## Install

`npm install form-ctrl-vanilla`

## Usage

```js
import { formCtrl } from 'form-ctrl-vanilla';

const form = formCtrl.create('form_id', {
  validationEventName: 'onChange',
  requiredMessage: 'Required field',
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
});

const inputEl = document.getElementById('input_id');
inputEl.addEventListener('change', (e) => form.handleChange('field_1', e));
inputEl.addEventListener('blur', () => form.handleBlur('field_1'));
```

```js
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
        needAllValues: boolean,
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

`required` is separate validation because the most used one and can have a special ui meaning as asterisk in label. Usually used as boolean flag. It has its default simple validate function instance wide, but can be rewritten with `options.requiredValidate` or validation object `requiredValidate`. Required message is provided instance wide as `options.requiredMessage` or as a string value of `required` validation parameter. For detailed `required` configuration - `Rule` object can be passed as `required` validation parameter.

Validation results in field state messages change (`form.getFieldState('field_1').messages = [{ message, type }, ...]`) and boolean flag returning (`form.validate('field_1') => boolean | Promise<boolean>`). Each validate function is run on specific event (or all of them if `'all'` is passed). Validation event is taken in this order `rule.eventName || validation.eventName || options.validationEventName`.

Detailed field validation configuration is defined with `Rule` objects in `rules` array.

`Rule.message` will go in `FieldMessage.message` as validation state result if `Rule.validate` failed (returns false) or if succeded and `Rule.typeIfPassed` provided.

`Rule.type` will go in `FieldMessage.type` if `Rule.validate` failed (returns false).

`Rule.typeIfPassed` should be provided if state message should exist event if `Rule.validate` succeded (returns true), will go in `FieldMessage.type`

`Rule.needAllValues` if provided - `Rule.validate` function will have all field values `formValues` as second argument (turned off by default because of potentially rare usage and slight overhead on use)

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

#### `hasErrors`

Returns `true` if at least one field has error.

#### `hasWarnings`

Returns `true` if at least one field has warning.

#### `options`

Get cloned instance options through getter or merge new options to existing ones through setter.

---

#### `clearState()`

Resets form state (such as `touch` and `changed`) to defaults. Clears all field states.

#### `clear(clearValidation)`

Clears form data - all state and values.
Additionally clears all validation if `clear(true)`.

#### `reset(values, validation)`

Clears all form and fields states.
Overrides field values with provided ones.
Overrides validation if provided (if not provided - is kept intact).

#### `destroy()`

Removes form instance from internal store.
Returns `true` if internal store still had this form instance.

---

#### `clearFieldState(field)`

Resets field state to default `{ touched: 0, changed: 0, blurred: 0 }`.

#### `getFieldState(field)`

Gets field state. If there was none creates and returns default one.

#### `getFieldData(field)`

Gets field state and value `{ ...state, value }`.

#### `clearFieldMessages(field, options)`

Clears field messages, error, warning.

#### `addFieldMessages(field, messages, { skipRerender })`

Adds one or many field messages. Previous field messages are kept intact.
`skipRerender` is described below.

#### `resetFieldMessages(field, messages, { skipRerender })`

Resets field messages to provided ones. Previous field messages are dropped.
`skipRerender` is described below.

---

#### `getValue(field)`

Gets field value. Value type can be specified for typescript version.

#### `getValues(fields)`

Gets fields values as plain object.
If `fields` provided - returns values only for them.
If not - returns all fields values.

#### `setValue(field, value, valuesSetterOptions)`

Sets field value with validation and other calculations.
Provide `valuesSetterOptions` to control things happening other than setting value (details below).

#### `setValues(values, valuesSetterOptions)`

Sets fields values with validation and other calculations.
`values` is plain object - field name as key, field value as value.
Provide `valuesSetterOptions` to control things happening other than setting values (details below).

#### `clearValues(valuesSetterOptions)`

Clears all fields values (deletes records from store) with validation and other calculations.
Provide `valuesSetterOptions` to control things happening other than clearing values (details below).

#### `resetValues(values, valuesSetterOptions)`

Clears all previous fields values records and sets provided ones.
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

`valuesSetterOptions.skipChangeUpdate` - boolean, skip incrementing `touched` and `changed` state.

`valuesSetterOptions.skipRerender` - avoid triggering `rerenderFields` (which is empty by default for vanilla version).

`valuesSetterOptions.skipValidation` - skip validation.

---

#### `handleChange(field, changeEvent)`

Should be used on `change` event of input field.
Form will set value, increment `touched` state, trigger `onTouch` validation.
`change` event object must be provided as second argument.
Value will be taken from it as `changeEvent.target.value`
or `changeEvent.target.checked` for checkbox input.
Generic `{ target: { value: '...' } }` is acceptable.
See usage section above for example.

#### `handleBlur(field)`

Should be used on `blur` event of input field.
Increments `blurred` state and trigger `onBlur` validation.
See usage section above for example.

---

#### `validate(fields, eventName)`

Trigger validation for one, many or all fields for specific event.
If `fields` is not provided - trigger validation for all fields that have validation.
Pass `eventName` to trigger only validation specified for that event, default `'all'`.
Returns promise only if encounters promisified validate function.
Trigger rerender after validation processed.
If validation results in promise - await it and rerender after.

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
  rerenderFields(fields) {
    // trigger rerender
  }

  getCustomFieldState(field) {
    return this.getFieldState(field).customState;
  }
}
```

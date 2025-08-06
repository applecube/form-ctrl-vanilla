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

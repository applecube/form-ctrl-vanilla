# FORM-CTRL-VANILLA

Zero dependency vanilla js form control map for multiple forms with values, state, validation. `FormCtrl` class can be extended for custom usage.

## Install

`npm install form-ctrl-vanilla`

## Usage

```js
import formCtrl from 'form-ctrl-vanilla';

const form = formCtrl.create('form_id_1', { validationEventName: 'onChange' });

const form2 = formCtrl('form_id_2'); // get or create
form2.setOptions({ validationEventName: 'onChange' });

form.setValues({ field_1: 5, field_2: 'asd' });

form.handleChange('field_1', changeEvent); // changeEvent.target.value will be used
form.handleBlur('field_1');

form.setValidation('field_1', {
  eventName: 'onChange',
  required: 'Required field',
  rules: [
    {
      message: 'Must be more than 10',
      type: 'error',
      typeIfPassed: 'success',
      validate: (value) => value > 10,
      eventName: 'onBlur',
    },
  ],
});

const {
  touched, // count number, changed by user
  changed, // count number
  blurred, // count number
  messages, // [{ message: 'Must be more than 10', type: 'error' }]
  error, // boolean
  warning. // boolean
} = form.getFieldState('field_1');

if (form.touched) { /*...*/ }
if (form.changed) { /*...*/ }
if (form.hasErrors) { /*...*/ }
if (form.hasWarnings) { /*...*/ }

form.destroy();
```

## Extend

[Implementation for React](https://github.com/applecube/form-ctrl-react)

```js
import { FormCtrl as FormCtrlVanilla } from 'form-ctrl-vanilla';

class FormCtrlCustom extends FormCtrlVanilla {
  constructor(options) {
    super(options);
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

# `form-ctrl-vanilla`

Multiple abstract forms with values, state, validation.

### [NPM](https://www.npmjs.com/package/form-ctrl-vanilla)

### [DOCS](https://github.com/applecube/form-ctrl-vanilla/blob/main/DOCS.md)

### [NPM React](https://www.npmjs.com/package/form-ctrl-react)

### [GitHub React](https://github.com/applecube/form-ctrl-react)

## Concepts

- Abstract form, purely js, without any html bindings like `<form>` or `<input data-form="form_id">`
- Binding to DOM happens through providing element links to form instance
- Any set of form controls (input any type, textarea, select) whenever they are on the page can be wrapped by this abstract form
- Multiple forms existing simultaneously on the same page, each can be retrieved by its own id
- Counters: how many times field was changed by user (`touched`), changed in general by user or any other means (`changed`), field blurred (`blurred`) - same ones exist for form instance itself
- Simple but customizable validation with multiple simple functions for each field, 4 validation types with ability to specify type if validation passed
- Boolean `error`, `warning` states for each field
- Generalized messages for each field - array by design (one is special case), 4 types `error` | `warning` | `info` | `success` (error is special case)
- Messages can exist as validation result or added through form instance api (use case - client and backend validation)
- Custom form event listeners: onValueChange, onErrorChange, onWarningChange, onMessagesChange
- Without heavy memory usage or computations
- 90%+ test coverage
- Zero dependencies
- Designed to be extended for framework usage ([React](https://github.com/applecube/form-ctrl-react))

## Usage

```js
import { formCtrl } from 'form-ctrl-vanilla';

// create form instance
const form = formCtrl.create('form_id', {
  defaultValues: {
    field_1: 'Text 1',
    field_2: 'Text 2',
    field_3: true,
  },
  register: {
    field_1: document.getElementById('input_1'),
    field_2: document.getElementById('input_2'),
    field_3: document.getElementById('checkbox'),
  },
  validation: {
    field_1: {
      required: true,
    },
    field_2: {
      rules: [
        {
          message: 'Should be longer than 5',
          type: 'warning',
          validate: (v) => v.length > 5,
        }
      ]
    }
  },
});

// send all form data
const sendData = (formId) => {
  const form = formCtrl(formId); // get form instance by id
  // if form values have not changed
  if (!form.changed) return;
  
  // form.validate returns promise only if
  // any rule validate function of any field is promisified
  if (!form.validate()) return;

  fetch('https://example.com/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(form.getValues())
  })
  .then(res => res.json())
  .then(data => form.reset(data.values));
}
```

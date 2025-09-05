- [`formCtrl`](#formctrl)
    - [`formCtrl(id)`](#formctrlid)
    - [`formCtrl.create(id, constructorOptions?)`](#formctrlcreateid-constructoroptions)
    - [`formCtrl.get(id)`](#formctrlgetid)
    - [`formCtrl.keys()`](#formctrlkeys)
    - [`formCtrl.destroyAll()`](#formctrldestroyall)
- [`FormCtrl` instance](#formctrl-instance)
  - [FormOptions](#formoptions)
    - [`formOptions.defaultValues`](#formoptionsdefaultvalues)
    - [`formOptions.onValueChange(field, value, prevValue, onChangeOptions?)`](#formoptionsonvaluechangefield-value-prevvalue-onchangeoptions)
    - [`formOptions.onMessagesChange(field, messages, prevMessages, onChangeOptions?)`](#formoptionsonmessageschangefield-messages-prevmessages-onchangeoptions)
    - [`formOptions.onErrorChange(field, error, prevError, onChangeOptions?)`](#formoptionsonerrorchangefield-error-preverror-onchangeoptions)
    - [`formOptions.onWarningChange(field, warning, prevWarning, onChangeOptions?)`](#formoptionsonwarningchangefield-warning-prevwarning-onchangeoptions)
    - [`formOptions.validationEventName`](#formoptionsvalidationeventname)
    - [`formOptions.requiredValidate`](#formoptionsrequiredvalidate)
    - [`formOptions.requiredMessage`](#formoptionsrequiredmessage)
  - [ConstructorOptions](#constructoroptions)
    - [`constructorOptions.values`](#constructoroptionsvalues)
    - [`constructorOptions.register`](#constructoroptionsregister)
    - [`constructorOptions.validation`](#constructoroptionsvalidation)
  - [Properties](#properties)
    - [`id` (readonly)](#id-readonly)
    - [`options`](#options)
    - [`touched` (readonly)](#touched-readonly)
    - [`changed` (readonly)](#changed-readonly)
    - [`blurred` (readonly)](#blurred-readonly)
    - [`hasErrors` (readonly)](#haserrors-readonly)
    - [`hasWarnings` (readonly)](#haswarnings-readonly)
  - [Form](#form)
    - [`clearState()`](#clearstate)
    - [`clear()`](#clear)
    - [`reset(newValues?)`](#resetnewvalues)
    - [`destroy()`](#destroy)
  - [FieldState](#fieldstate)
    - [`clearFieldState(field)`](#clearfieldstatefield)
    - [`getFieldState(field)`](#getfieldstatefield)
    - [`forceFieldError(field, error)`](#forcefielderrorfield-error)
    - [`forceFieldWarning(field, warning)`](#forcefieldwarningfield-warning)
    - [`unforceFieldError(field)`](#unforcefielderrorfield)
    - [`unforceFieldWarning(field)`](#unforcefieldwarningfield)
    - [`clearFieldMessages(field)`](#clearfieldmessagesfield)
    - [`clearFieldValidationMessages(field)`](#clearfieldvalidationmessagesfield)
    - [`clearFieldCustomMessages(field)`](#clearfieldcustommessagesfield)
    - [`addFieldCustomMessages(field, messages)`](#addfieldcustommessagesfield-messages)
    - [`resetFieldCustomMessages(field, messages)`](#resetfieldcustommessagesfield-messages)
    - [`clearMessages(fields?)`](#clearmessagesfields)
    - [`clearValidationMessages(fields?)`](#clearvalidationmessagesfields)
    - [`clearCustomMessages(fields?)`](#clearcustommessagesfields)
  - [Values](#values)
    - [`getValue(field)`](#getvaluefield)
    - [`getValues(fields?)`](#getvaluesfields)
    - [`setValue(field, value, valuesSetterOptions?)`](#setvaluefield-value-valuessetteroptions)
    - [`setValues(values, valuesSetterOptions?)`](#setvaluesvalues-valuessetteroptions)
    - [`clearValues(valuesSetterOptions?)`](#clearvaluesvaluessetteroptions)
    - [`resetValues(newValues?, valuesSetterOptions?)`](#resetvaluesnewvalues-valuessetteroptions)
    - [`valuesSetterOptions` argument](#valuessetteroptions-argument)
  - [DOM](#dom)
    - [`registerField(field, element)`](#registerfieldfield-element)
    - [`register(elementsMap)`](#registerelementsmap)
    - [`handleInput(field, event?)`](#handleinputfield-event)
    - [`handleBlur(field)`](#handleblurfield)
  - [FieldValidation](#fieldvalidation)
  - [Validate](#validate)
    - [`validateField(field, eventName?)`](#validatefieldfield-eventname)
    - [`validate(fields?, eventName?)`](#validatefields-eventname)
  - [ValidationSettings](#validationsettings)
    - [`getFieldValidation(field)`](#getfieldvalidationfield)
    - [`addFieldValidationRules(field, rules)`](#addfieldvalidationrulesfield-rules)
    - [`clearFieldValidation(field)`](#clearfieldvalidationfield)
    - [`setFieldValidation(field, partialFieldValidation)`](#setfieldvalidationfield-partialfieldvalidation)
    - [`resetFieldValidation(field, fieldValidation)`](#resetfieldvalidationfield-fieldvalidation)
    - [`getValidation()`](#getvalidation)
    - [`clearValidation()`](#clearvalidation)
    - [`setValidation(someFieldsValidation)`](#setvalidationsomefieldsvalidation)
    - [`resetValidation(allFieldsValidation)`](#resetvalidationallfieldsvalidation)

---

# `formCtrl`

Wrapper around `FormCtrl` class for convenience.

---

### `formCtrl(id)`

Get `FormCtrl` instance by `id`.
If none found - creates one (at least for type convenience).
For strict `get` use `formCtrl.get(id)`.

### `formCtrl.create(id, constructorOptions?)`

Create `FormCtrl` instance and register it in internal store by `id`.
Rewrite if there is already one for this `id`.
Same as `new FormCtrl(id, constructorOptions)`.

### `formCtrl.get(id)`

Get `FormCtrl` instance by `id`.
If none found - returns `undefined`.
Same as `FormCtrl.get(id)`.

### `formCtrl.keys()`

Get array of all `FormCtrl` ids.
Same as `FormCtrl.keys()`.

### `formCtrl.destroyAll()`

Destroy all current forms (remove from internal store).
Same as `FormCtrl.destroyAll()`

---

# `FormCtrl` instance

Each `FormCtrl` instance has id and registers itself in internal Map by this id for later retrieval.
Each instance has its own field values, states, validation, options.

---

## FormOptions

Can be accessed and changed with `form.options` property.
Initial ones are set through `ConstructorOptions`.
Every parameter is optional.

### `formOptions.defaultValues`

Initial values, are set at creation and can be restored to with `form.reset()`, `form.resetValues()`.
If everything is very dynamic and there is no initial anchor values of lifecycle,
it is better to use `constructorOptions.values` or `form.setValues(values)`.

### `formOptions.onValueChange(field, value, prevValue, onChangeOptions?)`

If provided will be triggered on every field value change.
Is triggered only if value really changed (`Object.is` comparison) -
`form.setValue(sameValue)` will not trigger it.

### `formOptions.onMessagesChange(field, messages, prevMessages, onChangeOptions?)`

If provided will be triggered on every field messages change.
Field messages array is immutable but recreated only if some part of messages really changed.
If there is or was no messages - `messages` or `prevMessages` will be `null`.

### `formOptions.onErrorChange(field, error, prevError, onChangeOptions?)`

If provided will be triggered on every field error flag change.
If `messages` changed and error is caused by other message -
error flag is not changed (true => true)
so this function will not be triggered.

`prevError` is redundant because `error != prevError` all the time,
but was added for consistency with other event listeners.

### `formOptions.onWarningChange(field, warning, prevWarning, onChangeOptions?)`

Same as `onErrorChange` but for `warning`.

### `formOptions.validationEventName`

`'onTouch' | 'onChange' | 'onBlur' | 'all'` defaults to `'onBlur'`.
Details are in `FieldValidation` section.

### `formOptions.requiredValidate`

Overrides default validate function for all fields required validation.
Details are in `FieldValidation` section.

### `formOptions.requiredMessage`

Default required failure validation message for all fields.
Details are in `FieldValidation` section.

---

## ConstructorOptions

used in
- `formCtrl.create(id, constructorOptions?)`
- `new FormCtrl(id, constructorOptions?)`

Extends `FormOptions`. Every parameter is optional.

### `constructorOptions.values`

Initial dynamic values. Same as `form.setValues(values)` right after instance creation,
but latter will cause validation trigger and state change.

### `constructorOptions.register`

Object with form `Field` as key and `HTMLElement | HTMLElement[]` as value.
Same as calling `form.register(register)`,
but without ability to get unregister functions.

### `constructorOptions.validation`

Object with form `Field` as key and `FieldValidation` as value.
Same as calling `form.setValidation(validation)`.

---

## Properties

### `id` (readonly)

ID of `FormCtrl` instance. `formCtrl('some_id').id = 'some_id'`

### `options`

Returns and sets form options.
Can be changed directly.
Same as `constructorOptions` except `values`, `register`, `validation`.

### `touched` (readonly)

Number of times form values have been changed by user.

### `changed` (readonly)

Number of times form values have been changed by any means (by user and api calls e.g. `setValue`).

### `blurred` (readonly)

Number of times form fields have been blurred (with `handleBlur`).

### `hasErrors` (readonly)

Returns `true` if at least one field has error.

### `hasWarnings` (readonly)

Returns `true` if at least one field has warning.

---

## Form

### `clearState()`

Clears all field states.

### `clear()`

Clears all fields states (messages, error, warning, etc) and values.
Validation settings are not changed.
To clear validation settings use `clearValidation`.

### `reset(newValues?)`

Clears all fields states (messages, error, warning, touched, changed, blurred).
Overrides field values with `newValues`, if none provided uses `defaultValues`.

Validation settings are not changed.
To clear or reset validation settings use `clearValidation` or `resetValidation`.

### `destroy()`

Removes form instance from internal store.
Returns `true` if internal store still had this form instance.

---

## FieldState

### `clearFieldState(field)`

Clears field state.
Messages, error, warning are dropped including custom messages and forced error / warning.
Returns `true` if there was a state for passed field.

### `getFieldState(field)`

Gets field state.
Should not be changed directly.

### `forceFieldError(field, error)`

Forces permanent field error, no matter validation results change.

To unforce use one of `unforceFieldError`, `clearFieldState`, `clearState`, `clear`, `reset`

### `forceFieldWarning(field, warning)`

Forces permanent field warning, no matter validation results change.

To unforce use one of `unforceFieldWarning`, `clearFieldState`, `clearState`, `clear`, `reset`

### `unforceFieldError(field)`

Clears permanent error override and recalculates error based on existing messages.

### `unforceFieldWarning(field)`

Clears permanent warning override and recalculates warning based on existing messages.

### `clearFieldMessages(field)`

Clears all field messages (validation and custom), error, warning.

### `clearFieldValidationMessages(field)`

Clears validation field messages (that can exist only as result of field validation).
Custom field messages are kept intact.

### `clearFieldCustomMessages(field)`

Clears custom field messages. Validation messages are kept intact.

### `addFieldCustomMessages(field, messages)`

Adds custom field messages. Previous field messages are kept intact.
These are separate from potential validation messages.

### `resetFieldCustomMessages(field, messages)`

Clears and adds new custom field messages. Validation messages are kept intact.

### `clearMessages(fields?)`

Clears messages, error, warning for provided fields or all fields.

### `clearValidationMessages(fields?)`

Clears validation messages, updates error, warning for provided fields or all fields.
Custom messages are kept intact.

### `clearCustomMessages(fields?)`

Clears custom messages, updates error, warning for provided fields or all fields.
Validation messages are kept intact.

---

## Values

### `getValue(field)`

Gets field value.

### `getValues(fields?)`

Gets fields values.
If `fields` provided - returns values only for them.
If not - returns all fields values.

It is better to use `getValues(['a', 'b'])`
than `getValues().a` `getValues().b`
performance wise.

### `setValue(field, value, valuesSetterOptions?)`

Sets field value to internal store and to registered DOM element(s).
Triggers onValueChange, onChange validation, increments changed.

### `setValues(values, valuesSetterOptions?)`

Sets fields values.

### `clearValues(valuesSetterOptions?)`

Clears all fields values with validation and other calculations.
Provide `valuesSetterOptions` to control things happening other than clearing values (details below).

### `resetValues(newValues?, valuesSetterOptions?)`

Clears old values and sets `newValues`, if none provided sets `form.options.defaultValues`.
Validation, state change, onValueChange happen for previous and new fields combined.
If field was there and provided again these things happen to it once.
Provide `valuesSetterOptions` to control things happening other than resetting values (details below).

### `valuesSetterOptions` argument

`valuesSetterOptions.byUser` - boolean, to mimic value change by user
`onChange` => `onTouch` validation,
increments `changed` => increments `changed` and `touched`,
default `false`

`valuesSetterOptions.skipChangeUpdate` - boolean, skip incrementing `touched` / `changed` state.

`valuesSetterOptions.skipValidation` - skip validation.

Other properties will be considered `onChangeOptions` and passed to event listeners like `onValueChange`.

---

## DOM

### `registerField(field, element)`

Saves element(s) to internal store and adds event listeners to them.

If element array is passed - field will be associated with all of them.
This is meant primarly for all radio or all checkboxes element groups.

Returns unregister function, that removes from internal store and removes event listeners.

### `register(elementsMap)`

Multiple `registerField`. Returns unregister function for each field.

### `handleInput(field, event?)`

For manual `input` handling.
Recommended way to wire DOM elements with form is `register` or `registerField`.

Handles user input, should be used on `input` event of input field.

If `event.target` exists it will be used to extract value.
Otherwise looks up for registered elements for that field and uses them.
If none found does nothing.

### `handleBlur(field)`

For manual `blur` handling.
Recommended way to wire DOM elements with form is `register` or `registerField`.

Should be used on `blur` event of input field.
Increments `blurred` state and triggers `onBlur` validation.

---

## FieldValidation

Schema:

```js
{
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
Providing it means that field validation depends on other field values,
but for now fields validation dependencies are not implemented,
so if related fields values change, this rule validate will not be triggered automatically.

`Rule.validate` - function runs on field validation if validation event matches occurred event.

`Rule.eventName` - event on which rule validation will run, overrides `validation.eventName` which overrides `options.validationEventName`

---

## Validate

### `validateField(field, eventName?)`

Triggers field validation for specific event.

Pass `eventName` to trigger only validation specified for that event, default `'all'`.

Returns promise only if encounters promisified validate function.

If any validate function throws an error be it sync or async -
catches error and considers it not passed (as if it returned `false`).

### `validate(fields?, eventName?)`

Triggers multiple fields validation for specific event.

If `fields` is not provided - trigger validation for all fields that have validation.

Pass `eventName` to trigger only validation specified for that event, default `'all'`.

Returns promise only if encounters promisified validate function.

If any validate function throws an error be it sync or async -
catches error and considers it not passed (as if it returned `false`).

---

## ValidationSettings

### `getFieldValidation(field)`

Gets field validation settings. Returns `undefined` if there are no settings.

Settings should not be changed directly.

To change settings use `setFieldValidation`, `resetFieldValidation`, `clearFieldValidation`, `addFieldValidationRules`.

### `addFieldValidationRules(field, rules)`

Ensures field validation settings and adds provided rules to it.
Previous rules, if there were any, are kept intact.
In contrast to other field validation manipulation methods
this one doesnt cause validation messages drop.

### `clearFieldValidation(field)`

Clears field validation settings.
Returns `true` if there were settings, `false` otherwise.

### `setFieldValidation(field, partialFieldValidation)`

Ensures field validation settings and overrides provided params in it.
Rules will be fully overriden.
To add validation rules without full override use `addFieldValidationRules`.
Returns full field validation settings.

### `resetFieldValidation(field, fieldValidation)`

Overrides field validation settings with provided ones.

### `getValidation()`

Gets copy of all fields validation settings.

### `clearValidation()`

Clears all fields validation settings.
Returns fields that had one.

### `setValidation(someFieldsValidation)`

Overrides validation settings for provided fields.
Other fields validation settings are kept intact.

### `resetValidation(allFieldsValidation)`

Clears all fields validation settings and sets provided ones.
Returns fields that had one (dropped and overriden).

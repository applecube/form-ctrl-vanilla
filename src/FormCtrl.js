import { ensureArray, everyItem } from './utils';

const formCtrlHolder = new Map();

export class FormCtrl {
  constructor(formId, { validationEventName, requiredMessage, requiredValidate, validation, values } = {}) {
    this.id = formId;

    this._options = {
      validationEventName: validationEventName || 'onBlur',
      requiredMessage,
      requiredValidate: requiredValidate || ((v) => v !== undefined && v !== null && v !== '' && v !== 0),
    };

    this._state = {};

    this._valuesMap = new Map();
    this._stateMap = new Map();
    this._validationMap = new Map();

    this.clearState();

    if (validation) this.setValidation(validation);

    if (values) this._setValues(values);

    formCtrlHolder.set(formId, this);
  }

  static get(formId) {
    return formCtrlHolder.get(formId);
  }

  static keys() {
    return formCtrlHolder.keys();
  }

  destroy() {
    return formCtrlHolder.delete(this.id);
  }

  clear(clearValidation) {
    if (clearValidation) this.clearValidation();
    this.clearState();
    this.clearValues({ skipChangeUpdate: true });
  }

  reset(values, validation) {
    if (validation) this.resetValidation(validation);
    this.clearState();
    this.resetValues(values, { skipChangeUpdate: true });
  }

  rerenderFields() {
    // Should be overwritten in subclass
  }

  // region FormState

  get touched() {
    return this._state.touched;
  }

  get changed() {
    return this._state.changed;
  }

  get hasErrors() {
    for (const fieldState of this._stateMap.values()) {
      if (fieldState.error) return true;
    }
    return false;
  }

  get hasWarnings() {
    for (const fieldState of this._stateMap.values()) {
      if (fieldState.warning) return true;
    }
    return false;
  }

  get options() {
    return { ...this._options };
  }

  set options(opts) {
    Object.assign(this._options, opts);
  }

  clearState() {
    for (const key in this._state) {
      delete this._state[key];
    }
    this._state.touched = 0;
    this._state.changed = 0;
    this._stateMap.clear();
  }

  // region FieldState

  clearFieldState(field) {
    const fieldState = { touched: 0, changed: 0, blurred: 0 };
    this._stateMap.set(field, fieldState);
    return fieldState;
  }

  getFieldState(field) {
    return this._stateMap.get(field) || this.clearFieldState(field);
  }

  getFieldData(field) {
    return {
      ...this.getFieldState(field),
      value: this.getValue(field),
    };
  }

  _clearFieldMessages(fieldState) {
    fieldState.messages = [];
    fieldState.error = false;
    fieldState.warning = false;
  }

  _addFieldMessage(fieldState, message) {
    fieldState.messages = fieldState.messages || [];
    fieldState.messages.push(message);
    fieldState.error = fieldState.error || message.type === 'error';
    fieldState.warning = fieldState.warning || message.type === 'warning';
  }

  clearFieldMessages(field, { skipRerender } = {}) {
    this._clearFieldMessages(this.getFieldState(field));

    if (!skipRerender) this.rerenderFields(field);
  }

  addFieldMessages(field, messages, { skipRerender } = {}) {
    const fieldState = this.getFieldState(field);

    for (const message of ensureArray(messages)) {
      this._addFieldMessage(fieldState, message);
    }

    if (!skipRerender) this.rerenderFields(field);
  }

  resetFieldMessages(field, messages, { skipRerender } = {}) {
    this.clearFieldMessages(field, { skipRerender: true });
    this.addFieldMessages(field, messages, { skipRerender });
  }

  // region Validation

  getFieldValidation(field) {
    return this._validationMap.get(field);
  }

  clearFieldValidation(field) {
    return this._validationMap.delete(field);
  }

  ensureFieldValidation(field) {
    let fieldValidation = this.getFieldValidation(field);
    if (!fieldValidation) {
      fieldValidation = {};
      this._validationMap.set(field, fieldValidation);
    }
    return fieldValidation;
  }

  addFieldValidationRules(field, rules) {
    const fieldValidation = this.ensureFieldValidation(field);
    fieldValidation.rules = fieldValidation.rules || [];
    fieldValidation.rules.push(...ensureArray(rules));
  }

  setFieldValidation(field, partialFieldValidation) {
    Object.assign(this.ensureFieldValidation(field), partialFieldValidation);
  }

  resetFieldValidation(field, fieldValidation) {
    this._validationMap.set(field, fieldValidation);
  }

  clearValidation() {
    this._validationMap.clear();
  }

  setValidation(validation) {
    for (const field in validation) {
      this.resetFieldValidation(field, validation[field]);
    }
  }

  resetValidation(validation) {
    this.clearValidation();
    this.setValidation(validation);
  }

  _validateField(field, eventName = 'all') {
    const fieldValidation = this._validationMap.get(field);
    if (!fieldValidation) return true;

    const fieldState = this.getFieldState(field);
    this._clearFieldMessages(fieldState);

    let promisified = false;
    const results = [];

    const validateRule = (rule) => {
      if (eventName !== 'all') {
        const ruleEventName = rule.eventName || fieldValidation.eventName || this.options.validationEventName;

        if (
          ruleEventName !== 'all' &&
          ruleEventName !== eventName &&
          (eventName !== 'onTouch' || ruleEventName !== 'onChange')
        )
          return;
      }

      const passedMaybePromise = rule.validate
        ? rule.validate(this.getValue(field), rule.needAllValues ? this.getValues() : undefined)
        : false;

      const processPassed = (passed) => {
        const msgType = passed ? rule.typeIfPassed : rule.type || 'error';

        if (msgType) {
          this._addFieldMessage(fieldState, {
            message: rule.message,
            type: msgType,
          });
        }

        return Boolean(passed);
      };

      let result;
      if (passedMaybePromise instanceof Promise) {
        promisified = true;
        result = passedMaybePromise.then(processPassed);
      } else {
        result = processPassed(passedMaybePromise);
      }

      results.push(result);
    };

    if (fieldValidation.required) {
      const required = fieldValidation.required;
      let requiredRule = required;

      if (typeof required !== 'object') {
        requiredRule = { type: 'error' };
        requiredRule.validate = fieldValidation.requiredValidate || this._options.requiredValidate;
        requiredRule.message = typeof required === 'string' ? required : this._options.requiredMessage;
      }

      validateRule(requiredRule);
    }

    for (const rule of ensureArray(fieldValidation.rules)) {
      validateRule(rule);
    }

    return promisified ? Promise.all(results).then(everyItem) : everyItem(results);
  }

  _validate(fields, eventName = 'all') {
    let promisified = false;
    const allResults = [];

    for (const field of fields ? ensureArray(fields) : this._validationMap.keys()) {
      const passedMaybePromise = this._validateField(field, eventName);

      if (passedMaybePromise instanceof Promise) promisified = true;

      allResults.push(passedMaybePromise);
    }

    return promisified ? Promise.all(allResults).then(everyItem) : everyItem(allResults);
  }

  validate(fields, eventName = 'all') {
    const passedMaybePromise = this._validate(fields, eventName);

    if (passedMaybePromise instanceof Promise) {
      return passedMaybePromise.then((passed) => {
        this.rerenderFields(fields);
        return passed;
      });
    }

    this.rerenderFields(fields);
    return passedMaybePromise;
  }

  // region Values

  getValue(field) {
    return this._valuesMap.get(field);
  }

  getValues(fields) {
    const valuesMap = this._valuesMap;

    if (!Array.isArray(fields)) return Object.fromEntries(valuesMap);

    return fields.reduce((result, field) => {
      result[field] = valuesMap.get(field);
      return result;
    }, {});
  }

  _setValue(field, value) {
    this._valuesMap.set(field, value);
  }

  setValue(field, value, options) {
    this._setValue(field, value);
    this.onAfterValuesChange(field, options);
  }

  _setValues(values) {
    for (const field in values) {
      this._setValue(field, values[field]);
    }
  }

  setValues(values, options) {
    this._setValues(values);
    this.onAfterValuesChange(Object.keys(values), options);
  }

  clearValues(options) {
    const fields = this._valuesMap.keys();
    this._valuesMap.clear();
    this.onAfterValuesChange(fields, options);
  }

  resetValues(values, options) {
    const fieldSet = new Set(this._valuesMap.keys());
    this._valuesMap.clear();

    for (const field in values) {
      this._valuesMap.set(field, values[field]);
      fieldSet.add(field);
    }

    this.onAfterValuesChange([...fieldSet], options);
  }

  onAfterValuesChange(fields, { byUser, skipChangeUpdate, skipRerender, skipValidation } = {}) {
    if (!skipChangeUpdate) {
      const ownState = this._state;

      for (const field of ensureArray(fields)) {
        const fieldState = this.getFieldState(field);

        ownState.changed++;
        fieldState.changed++;

        if (byUser) {
          ownState.touched++;
          fieldState.touched++;
        }
      }
    }

    if (!skipValidation) {
      const passedMaybePromise = this._validate(fields, byUser ? 'onTouch' : 'onChange');
      if (passedMaybePromise instanceof Promise && !skipRerender) {
        passedMaybePromise.then(() => this.rerenderFields(fields));
      }
    }

    if (!skipRerender) this.rerenderFields(fields);
  }

  // region Events

  handleChange(field, e) {
    this.setValue(field, e.target.value, { byUser: true });
  }

  handleBlur(field) {
    const fieldState = this.getFieldState(field);
    fieldState.blurred++;
    this.validate(field, 'onBlur');
  }
}

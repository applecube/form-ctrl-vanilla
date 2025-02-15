import { ensureArray, everyItem } from './utils';

export const formCtrlHolder = new Map();

export class FormCtrl {
  constructor(formId, options) {
    this.id = formId;

    const _options = options ? { ...options } : {};
    _options.validationEventName = _options.validationEventName || 'onBlur';
    this._options = _options;

    this._state = {
      touched: 0,
      changed: 0,
    };

    this._valuesMap = new Map();
    this._stateMap = new Map();
    this._validationMap = new Map();

    formCtrlHolder.set(formId, this);
  }

  destroy() {
    return formCtrlHolder.delete(this.id);
  }

  rerenderFields() {
    // Should be written in subclass
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

  // region GetValues
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

  // region FieldState
  resetFieldState(field) {
    const fieldState = { touched: 0, changed: 0, blurred: 0 };
    this._stateMap.set(field, fieldState);
    return fieldState;
  }

  getFieldState(field) {
    return this._stateMap.get(field) || this.resetFieldState(field);
  }

  addFieldMessageInternal(fieldState, message) {
    fieldState.messages = fieldState.messages || [];
    fieldState.messages.push(message);
    fieldState.error = fieldState.error || message.type === 'error';
    fieldState.warning = fieldState.warning || message.type === 'warning';
  }

  resetFieldMessagesInternal(fieldState) {
    fieldState.messages = [];
    fieldState.error = false;
    fieldState.warning = false;
  }

  setFieldMessages(field, messages, { reset, skipRerender } = {}) {
    const fieldState = this.getFieldState(field);
    if (reset) this.resetFieldMessagesInternal(fieldState);

    for (const message of ensureArray(messages)) {
      this.addFieldMessageInternal(fieldState, message);
    }

    if (!skipRerender) this.rerenderFields(field);

    return this;
  }

  // region Validation
  setValidation(field, { eventName, rules, required, requiredValidate } = {}) {
    const validation = {
      eventName,
      rules: rules || [],
    };

    if (required) {
      validation.rules = [...validation.rules];

      let requiredRule = required;

      if (typeof required !== 'object') {
        requiredRule = { type: 'error' };
        requiredRule.validate = requiredValidate || ((v) => v !== undefined && v !== null && v !== '' && v !== 0);
        if (typeof required === 'string') requiredRule.message = required;
      }

      validation.rules.unshift(requiredRule);
    }

    this._validationMap.set(field, validation);
  }

  validateFieldInternal(field, eventName = 'all') {
    const fieldValidation = this._validationMap.get(field);
    if (!fieldValidation?.rules?.length) return true;

    const fieldState = this.getFieldState(field);
    this.resetFieldMessagesInternal(fieldState);

    let promisified = false;
    const results = [];

    for (const rule of fieldValidation.rules) {
      if (eventName !== 'all') {
        const ruleEventName = rule.eventName || fieldValidation.eventName || this.options.validationEventName;

        if (ruleEventName !== 'all' && ruleEventName !== eventName) {
          continue;
        }
      }

      const passedMaybePromise = rule.validate
        ? rule.validate(this.getValue(field), rule.needAllValues ? this.getValues() : undefined)
        : false;

      const processPassed = (passed) => {
        const msgType = passed ? rule.typeIfPassed : rule.type || 'info';

        if (msgType) {
          this.addFieldMessageInternal(fieldState, {
            message: rule.message,
            type: msgType,
          });
        }

        return passed;
      };

      let result;
      if (passedMaybePromise instanceof Promise) {
        promisified = true;
        result = passedMaybePromise.then(processPassed);
      } else {
        result = processPassed(passedMaybePromise);
      }

      results.push(result);
    }

    return promisified ? Promise.all(results).then(everyItem) : everyItem(results);
  }

  validateInternal(fields, triggeredEventName = 'all') {
    let promisified = false;
    const allResults = [];

    for (const field of fields ? ensureArray(fields) : this._validationMap.keys()) {
      const passedMaybePromise = this.validateFieldInternal(field, triggeredEventName);

      if (passedMaybePromise instanceof Promise) promisified = true;

      allResults.push(passedMaybePromise);
    }

    return promisified ? Promise.all(allResults).then(everyItem) : everyItem(allResults);
  }

  validate(fields, eventName = 'all') {
    const passedMaybePromise = this.validateInternal(fields, eventName);

    if (passedMaybePromise instanceof Promise) {
      return passedMaybePromise.then((passed) => {
        this.rerenderFields(fields);
        return passed;
      });
    }

    this.rerenderFields(fields);
    return passedMaybePromise;
  }

  // region SetValues
  setValueInternal(field, value, byUser) {
    this._valuesMap.set(field, value);

    const ownState = this._state;
    ownState.changed++;
    if (byUser) ownState.touched++;

    const fieldState = this.getFieldState(field);
    fieldState.changed++;
    if (byUser) fieldState.touched++;
  }

  setValue(field, value, { byUser, skipRerender, skipValidation } = {}) {
    this.setValueInternal(field, value, byUser);

    if (!skipValidation) {
      const passedMaybePromise = this.validateFieldInternal(field, 'onChange');
      if (passedMaybePromise instanceof Promise && !skipRerender) {
        passedMaybePromise.then(() => this.rerenderFields(field));
      }
    }

    if (!skipRerender) this.rerenderFields(field);
  }

  setValues(values, { byUser, skipRerender, skipValidation } = {}) {
    const fields = Object.keys(values);
    if (!fields.length) return;

    for (const field of fields) {
      this.setValueInternal(field, values[field], byUser);
    }

    if (!skipValidation) {
      const passedMaybePromise = this.validateInternal(fields, 'onChange');
      if (passedMaybePromise instanceof Promise && !skipRerender) {
        passedMaybePromise.then(() => this.rerenderFields(fields));
      }
    }

    if (!skipRerender) this.rerenderFields(fields);
  }

  // region OnChange OnBlur
  handleChange(field, e) {
    this.setValue(field, e.target.value, { byUser: true });
  }

  handleBlur(field) {
    const fieldState = this.getFieldState(field);
    fieldState.blurred++;
    this.validateInternal(field, 'onBlur');
  }
}

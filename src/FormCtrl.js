import { ensureArray, everyItem } from './utils';

const formCtrlHolder = new Map();

export class FormCtrl {
  constructor(formId, { validationEventName, validation, values } = {}) {
    this.id = formId;

    this._options = {
      validationEventName: validationEventName || 'onBlur',
    };

    this._state = {};

    this._valuesMap = new Map();
    this._stateMap = new Map();
    this._validationMap = new Map();

    this.clearState();

    if (validation) this.setValidation(validation);

    if (values) this.setValues(values, { skipChangeUpdate: true, skipRerender: true, skipValidation: true });

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
    if (clearValidation) this._validationMap.clear();
    this.clearState();
    this.clearValues({ skipChangeUpdate: true });
  }

  reset(values, validation) {
    if (validation) {
      this._validationMap.clear();
      this.setValidation(validation);
    }
    this.clearState();
    this.resetValues(values, { skipChangeUpdate: true });
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
  setFieldValidation(field, { eventName, rules, required, requiredValidate } = {}) {
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

  setValidation(validation) {
    for (const field in validation) {
      this.setFieldValidation(field, validation[field]);
    }
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
  setValue(field, value, options) {
    this._valuesMap.set(field, value);
    this.onAfterValuesChange(field, options);
  }

  setValues(values, options) {
    const fields = Object.keys(values);
    if (!fields.length) return;

    for (const field of fields) {
      this._valuesMap.set(field, values[field]);
    }

    this.onAfterValuesChange(fields, options);
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

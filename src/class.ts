import { ensureArray, everyItem } from './utils.js';
import type {
  FormOptions,
  FormState,
  FormFieldsMap,
  FormFieldState,
  FormFieldValidation,
  FormId,
  FormConstructorOptions,
  FormValidation,
  FormValues,
  FormField,
  FormFieldData,
  FormFieldMessage,
  FormStateSetterOptions,
  FormValuesSetterOptions,
  FormFieldValidationRule,
  FormValidationEventName,
} from './types.js';

const formCtrlHolder = new Map<FormId, FormCtrl>();

/**
 * Main class for form states, values, validation, rerenders and processing those things.
 *
 * Rerender logic is empty by default and if needed should be assigned in subclass with `rerenderFields` method.
 */
export class FormCtrl {
  readonly id: FormId;
  protected readonly _options: FormOptions;
  protected readonly _state: FormState;
  protected readonly _valuesMap: FormFieldsMap;
  protected readonly _stateMap: FormFieldsMap<FormFieldState>;
  protected readonly _validationMap: FormFieldsMap<FormFieldValidation>;

  // region Constructor

  constructor(formId: FormId, options: FormConstructorOptions = {}) {
    const { validationEventName, requiredMessage, requiredValidate, validation, values } = options;
    this.id = formId;

    this._options = {
      validationEventName: validationEventName || 'onBlur',
      requiredMessage,
      requiredValidate:
        requiredValidate || ((v) => v !== undefined && v !== null && v !== '' && v !== 0),
    };

    this._state = { touched: 0, changed: 0 };

    this._valuesMap = new Map();
    this._stateMap = new Map();
    this._validationMap = new Map();

    if (validation) this.setValidation(validation);

    if (values) this._setValues(values);

    formCtrlHolder.set(formId, this);
  }

  // region Form

  /**
   * Get form instance from internal store by id.
   * Generic class type because of typescript static method issue.
   * https://github.com/microsoft/TypeScript/issues/5863#issuecomment-169173943
   */
  static get<T extends FormCtrl = FormCtrl>(formId: FormId): T | undefined {
    return formCtrlHolder.get(formId) as T | undefined;
  }

  /**
   * Get all form ids from internal store.
   */
  static keys(): FormId[] {
    return [...formCtrlHolder.keys()];
  }

  /**
   * Removes form instance from internal store.
   */
  destroy(): boolean {
    return formCtrlHolder.delete(this.id);
  }

  /**
   * Clears form data - all state and values.
   * Additionally clears all validation if `clear(true)`.
   */
  clear(clearValidation?: boolean): void {
    if (clearValidation) this.clearValidation();
    this.clearState();
    this.clearValues({ skipChangeUpdate: true });
  }

  /**
   * Clears all form and fields states.
   * Overrides field values with provided ones.
   * Overrides validation if provided (if not provided - is kept intact).
   */
  reset(values: FormValues, validation?: FormValidation): void {
    if (validation) this.resetValidation(validation);
    this.clearState();
    this.resetValues(values, { skipChangeUpdate: true });
  }

  /**
   * Number of times form values have been changed by user.
   */
  get touched(): number {
    return this._state.touched;
  }

  /**
   * Number of times form values have been changed by any means (by user and api calls e.g. `setValue`).
   */
  get changed(): number {
    return this._state.changed;
  }

  /**
   * Returns `true` if at least one field has error.
   */
  get hasErrors(): boolean {
    for (const fieldState of this._stateMap.values()) {
      if (fieldState.error) return true;
    }
    return false;
  }

  /**
   * Returns `true` if at least one field has warning.
   */
  get hasWarnings(): boolean {
    for (const fieldState of this._stateMap.values()) {
      if (fieldState.warning) return true;
    }
    return false;
  }

  get options(): FormOptions {
    return { ...this._options };
  }

  set options(formOptions: Partial<FormOptions>) {
    Object.assign(this._options, formOptions);
  }

  /**
   * Resets form state to defaults. Clears all field states.
   */
  clearState(): void {
    for (const key in this._state) {
      delete this._state[key as keyof FormState];
    }
    this._state.touched = 0;
    this._state.changed = 0;
    this._stateMap.clear();
  }

  // region Field

  // eslint-disable-next-line
  protected rerenderFields(fields?: FormField | FormField[]): void {
    // Should be overwritten in subclass
  }

  /**
   * Resets field state to defaults.
   */
  clearFieldState(field: FormField): FormFieldState {
    const fieldState = { touched: 0, changed: 0, blurred: 0 };
    this._stateMap.set(field, fieldState);
    return fieldState;
  }

  /**
   * Gets field state.
   */
  getFieldState(field: FormField): FormFieldState {
    return this._stateMap.get(field) || this.clearFieldState(field);
  }

  /**
   * Gets full field data (state and value).
   */
  getFieldData<V = unknown>(field: FormField): FormFieldData<V> {
    return {
      ...this.getFieldState(field),
      value: this.getValue<V>(field),
    };
  }

  /**
   * Internal modification of field state - clears messages, error, warning.
   */
  protected _clearFieldMessages(fieldState: FormFieldState): void {
    fieldState.messages = [];
    fieldState.error = false;
    fieldState.warning = false;
  }

  /**
   * Internal modification of field state - add messages, check error, check warning.
   */
  protected _addFieldMessage(fieldState: FormFieldState, message: FormFieldMessage): void {
    fieldState.messages = fieldState.messages || [];
    fieldState.messages.push(message);
    fieldState.error = fieldState.error || message.type === 'error';
    fieldState.warning = fieldState.warning || message.type === 'warning';
  }

  /**
   * Clears field messages, error, warning.
   */
  clearFieldMessages(field: FormField, options: FormStateSetterOptions = {}): void {
    this._clearFieldMessages(this.getFieldState(field));

    if (!options.skipRerender) this.rerenderFields(field);
  }

  /**
   * Adds one or many field messages. Previous field messages are kept intact.
   */
  addFieldMessages(
    field: FormField,
    messages: FormFieldMessage | FormFieldMessage[],
    options: FormStateSetterOptions = {},
  ): void {
    const fieldState = this.getFieldState(field);

    for (const message of ensureArray(messages)) {
      this._addFieldMessage(fieldState, message);
    }

    if (!options.skipRerender) this.rerenderFields(field);
  }

  /**
   * Resets field messages to provided ones. Previous field messages are dropped.
   */
  resetFieldMessages(
    field: FormField,
    messages: FormFieldMessage | FormFieldMessage[],
    options: FormStateSetterOptions = {},
  ): void {
    this.clearFieldMessages(field, { skipRerender: true });
    this.addFieldMessages(field, messages, { skipRerender: options.skipRerender });
  }

  // region Values

  /**
   * Gets field value. Value type can be specified.
   */
  getValue<V = unknown>(field: FormField): V {
    return this._valuesMap.get(field) as V;
  }

  /**
   * Gets fields values.
   * If `fields` provided - returns values only for them.
   * If not - returns all fields values.
   */
  getValues<F extends FormField = FormField>(
    fields?: F[],
  ): typeof fields extends F[] ? Pick<FormValues, F> : FormValues {
    const valuesMap = this._valuesMap;

    if (!Array.isArray(fields)) return Object.fromEntries(valuesMap);

    return fields.reduce(
      (result, field) => {
        result[field] = valuesMap.get(field);
        return result;
      },
      {} as Pick<FormValues, F>,
    );
  }

  /**
   * Internal simple field value setter. Without validation and other calculations.
   */
  protected _setValue(field: FormField, value: unknown): void {
    this._valuesMap.set(field, value);
  }

  /**
   * Sets field value with validation and other calculations.
   * Provide `options` to control things happening other than setting value.
   */
  setValue(field: FormField, value: unknown, options?: FormValuesSetterOptions): void {
    this._setValue(field, value);
    this.onAfterValuesChange(field, options);
  }

  /**
   * Internal simple fields values setter. Without validation and other calculations.
   */
  protected _setValues(values: FormValues): void {
    for (const field in values) {
      this._setValue(field, values[field]);
    }
  }

  /**
   * Sets fields values with validation and other calculations.
   * Provide `options` to control things happening other than setting values.
   */
  setValues(values: FormValues, options?: FormValuesSetterOptions): void {
    this._setValues(values);
    this.onAfterValuesChange(Object.keys(values), options);
  }

  /**
   * Clears all fields values (deletes records from store) with validation and other calculations.
   * Provide `options` to control things happening other than clearing values.
   */
  clearValues(options?: FormValuesSetterOptions): void {
    const fields = [...this._valuesMap.keys()];
    this._valuesMap.clear();
    this.onAfterValuesChange(fields, options);
  }

  /**
   * Clears all previous fields values records and sets provided ones.
   * Validation, state change, rerender happen for previous and new fields combined.
   * If field was there and provided again above things happen to it once.
   */
  resetValues(values: FormValues, options?: FormValuesSetterOptions): void {
    const fieldSet = new Set(this._valuesMap.keys());
    this._valuesMap.clear();

    for (const field in values) {
      this._valuesMap.set(field, values[field]);
      fieldSet.add(field);
    }

    this.onAfterValuesChange([...fieldSet], options);
  }

  /**
   * Internal trigger of things that should happen on after field values change -
   * validation, state change, rerender.
   */
  protected onAfterValuesChange(
    fields: FormField | FormField[],
    options: FormValuesSetterOptions = {},
  ): void {
    const { byUser, skipChangeUpdate, skipRerender, skipValidation } = options;

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

  // region DOM

  /**
   * Should be used on `change` event of input field.
   * Form will set value, trigger `onTouch` validation, etc.
   *
   * `change` event object must be provided as second argument.
   *
   * Value will be taken from it as `changeEvent.target.value` or `changeEvent.target.checked` for checkbox input.
   *
   * Generic `{ target: { value: '...' } }` is acceptable.
   */
  handleChange(field: FormField, changeEvent: any): void {
    if (!changeEvent || typeof changeEvent !== 'object') return;

    const el = changeEvent.target;
    if (!el || typeof el !== 'object') return;

    const value = el.type === 'checkbox' ? el.checked : el.value;

    this.setValue(field, value, { byUser: true });
  }

  /**
   * Should be used on `blur` event of input field.
   * Increments `blurred` state and trigger `onBlur` validation.
   */
  handleBlur(field: FormField): void {
    const fieldState = this.getFieldState(field);
    fieldState.blurred++;
    this.validate(field, 'onBlur');
  }

  // region Validation

  /**
   * Gets field validation record. Returns `undefined` if there is no record.
   * This record can be directly changed (is mutable).
   */
  getFieldValidation(field: FormField): FormFieldValidation | undefined {
    return this._validationMap.get(field);
  }

  /**
   * Remove field validation record.
   * Returns `true` if there was a record, `false` otherwise.
   */
  clearFieldValidation(field: FormField): boolean {
    return this._validationMap.delete(field);
  }

  /**
   * Ensures field validation record and returns it.
   */
  ensureFieldValidation(field: FormField): FormFieldValidation {
    let fieldValidation = this.getFieldValidation(field);
    if (!fieldValidation) {
      fieldValidation = {};
      this._validationMap.set(field, fieldValidation);
    }
    return fieldValidation;
  }

  /**
   * Ensures field validation record and adds provided rule or rules to it.
   * Previous rules, if there were any, are kept intact.
   */
  addFieldValidationRules(
    field: FormField,
    rules: FormFieldValidationRule | FormFieldValidationRule[],
  ): void {
    const fieldValidation = this.ensureFieldValidation(field);
    fieldValidation.rules = fieldValidation.rules || [];
    fieldValidation.rules.push(...ensureArray(rules));
  }

  /**
   * Ensures field validation record and overrides provided params in it.
   * Rules will be fully overriden.
   * To add validation rules without full override use `addFieldValidationRules`.
   */
  setFieldValidation(field: FormField, partialFieldValidation: Partial<FormFieldValidation>): void {
    Object.assign(this.ensureFieldValidation(field), partialFieldValidation);
  }

  /**
   * Overrides field validation with provided one.
   */
  resetFieldValidation(field: FormField, fieldValidation: FormFieldValidation): void {
    this._validationMap.set(field, fieldValidation);
  }

  /**
   * Clears all fields validations.
   */
  clearValidation(): void {
    this._validationMap.clear();
  }

  /**
   * Overrides validation for provided fields. Other fields validations are kept intact.
   */
  setValidation(someFieldsValidation: Partial<FormValidation>): void {
    for (const field in someFieldsValidation) {
      if (someFieldsValidation[field]) {
        this.resetFieldValidation(field, someFieldsValidation[field]);
      }
    }
  }

  /**
   * Clears all fields validations and sets provided ones.
   */
  resetValidation(allFieldsValidation: FormValidation): void {
    this.clearValidation();
    this.setValidation(allFieldsValidation);
  }

  /**
   * Internal main field validation logic.
   *
   * Pass `eventName` to trigger only validation specified for that event, default `'all'`.
   *
   * Returns promise only if at least one rule validate function is promisified.
   */
  protected _validateField(
    field: FormField,
    eventName: FormValidationEventName = 'all',
  ): boolean | Promise<boolean> {
    const fieldValidation = this._validationMap.get(field);
    if (!fieldValidation) return true;

    const fieldState = this.getFieldState(field);
    this._clearFieldMessages(fieldState);

    let promisified = false;
    const results: (boolean | Promise<boolean>)[] = [];

    const validateRule = (rule: FormFieldValidationRule) => {
      if (eventName !== 'all') {
        const ruleEventName =
          rule.eventName || fieldValidation.eventName || this.options.validationEventName;

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

      const processPassed = (passed: boolean) => {
        const msgType = passed ? rule.typeIfPassed : rule.type || 'error';

        if (msgType) {
          this._addFieldMessage(fieldState, {
            message: rule.message,
            type: msgType,
          });
        }

        // to be sure
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

      const requiredRule: FormFieldValidationRule =
        typeof required === 'object' ? required : { type: 'error' };

      if (typeof required !== 'object') {
        requiredRule.validate = fieldValidation.requiredValidate || this._options.requiredValidate;
        requiredRule.message =
          typeof required === 'string' ? required : this._options.requiredMessage;
      }

      validateRule(requiredRule);
    }

    for (const rule of ensureArray(fieldValidation.rules)) {
      validateRule(rule);
    }

    return promisified ? Promise.all(results).then(everyItem) : everyItem(results);
  }

  /**
   * Internal multiple fields validation logic. One or many fields can be provided.
   * If `fields` is not provided - trigger validation for all fields that have validation.
   *
   * Pass `eventName` to trigger only validation specified for that event, default `'all'`.
   *
   * Returns promise only if at least one rule validate function for at least one field is promisified.
   */
  protected _validate(
    fields?: FormField | FormField[],
    eventName?: FormValidationEventName,
  ): boolean | Promise<boolean> {
    let promisified = false;
    const allResults = [];

    for (const field of fields ? ensureArray(fields) : this._validationMap.keys()) {
      const passedMaybePromise = this._validateField(field, eventName);

      if (passedMaybePromise instanceof Promise) promisified = true;

      allResults.push(passedMaybePromise);
    }

    return promisified ? Promise.all(allResults).then(everyItem) : everyItem(allResults);
  }

  /**
   * Trigger validation for one, many or all fields for specific event.
   *
   * If `fields` is not provided - trigger validation for all fields that have validation.
   *
   * Pass `eventName` to trigger only validation specified for that event, default `'all'`.
   *
   * Returns promise only if encounters promisified validate function.
   *
   * Trigger rerender after validation processed.
   * If validation results in promise - await it and rerender after.
   */
  validate(
    fields?: FormField | FormField[],
    eventName?: FormValidationEventName,
  ): boolean | Promise<boolean> {
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
}

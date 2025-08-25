import { everyTruthy, shallowEqual } from './utils.js';
import type {
  FormOptions,
  FormFieldState,
  FormFieldValidation,
  FormId,
  FormConstructorOptions,
  FormValidation,
  FormValues,
  FormField,
  FormFieldMessage,
  FormValuesSetterOptions,
  FormFieldValidationRule,
  FormValidationEventName,
  FormFieldRequiredValidate,
  FormFieldInternalState,
} from './types.js';

const formCtrlHolder = new Map<FormId, FormCtrl<any, any>>();

export const FORM_CTRL_DEFAULTS: {
  validationEventName: FormValidationEventName;
  requiredValidate: FormFieldRequiredValidate;
  requiredMessage?: string;
} = {
  validationEventName: 'onBlur',
  requiredValidate: (v) => v !== undefined && v !== null && v !== '' && v !== 0,
};

type RerenderOptions<O> = Omit<O, keyof FormValuesSetterOptions>;

/**
 * Main class for form states, values, validation, rerenders and processing those things.
 *
 * Each form is new instance, saved in internal store by id.
 *
 * Rerender logic is empty by default and if needed should be assigned in subclass with `_rerenderField` method.
 */
export class FormCtrl<
  FV extends object = FormValues,
  O extends FormValuesSetterOptions = FormValuesSetterOptions,
> {
  readonly id: FormId;
  protected readonly _options: FormOptions<FV>;
  protected readonly _valuesMap: Map<FormField<FV>, any>;
  protected readonly _stateMap: Map<FormField<FV>, FormFieldState | undefined>;
  protected readonly _internalStateMap: Map<FormField<FV>, FormFieldInternalState | undefined>;
  protected readonly _validationMap: Map<FormField<FV>, FormFieldValidation<FV> | undefined>;

  // region Constructor

  constructor(formId: FormId, options: FormConstructorOptions<FV> = {}) {
    const { validationEventName, requiredMessage, requiredValidate, validation, values } = options;
    this.id = formId;
    this._options = {
      validationEventName,
      requiredMessage,
      requiredValidate,
    };

    this._valuesMap = new Map();
    this._stateMap = new Map();
    this._internalStateMap = new Map();
    this._validationMap = new Map();

    if (validation) this._setValidation(validation);
    if (values) this._setValues(values);

    formCtrlHolder.set(formId, this);
  }

  // region Static

  /**
   * Get form instance from internal store by id.
   * Generic class type because of typescript static method issue.
   * https://github.com/microsoft/TypeScript/issues/5863#issuecomment-169173943
   */
  static get<T extends FormCtrl<any, any> = FormCtrl<any, any>>(formId: FormId): T | undefined {
    return formCtrlHolder.get(formId) as T | undefined;
  }

  /**
   * Get all form ids from internal store.
   */
  static keys(): FormId[] {
    return [...formCtrlHolder.keys()];
  }

  /**
   * Removes all form instances from internal store.
   */
  static destroyAll(): void {
    formCtrlHolder.clear();
  }

  // region FormState
  /**
   * Removes form instance from internal store.
   */
  destroy(): boolean {
    return formCtrlHolder.delete(this.id);
  }

  /**
   * Clears all field states.
   */
  clearState(rerenderOptions?: RerenderOptions<O>): void {
    this._rerenderFields(this._clearState(), rerenderOptions);
  }

  /**
   * Clears all fields states (messages, error, warning, etc) and values.
   * Validation settings are not changed.
   * To clear validation settings use `clearValidation`.
   */
  clear(rerenderOptions?: RerenderOptions<O>): void {
    this._rerenderFields(new Set([...this._clearState(), ...this._clearValues()]), rerenderOptions);
  }

  /**
   * Clears all fields states (messages, error, warning, etc) and values.
   * Overrides field values with provided ones.
   * Validation settings are not changed.
   * To reset validation settings use `resetValidation`.
   */
  reset(values: FV, rerenderOptions?: RerenderOptions<O>): void {
    this._rerenderFields(
      new Set([...this._clearState(), ...this._resetValues(values)]),
      rerenderOptions,
    );
  }

  /**
   * Number of times form values have been changed by user.
   */
  get touched(): number {
    let touched = 0;
    for (const fieldState of this._stateMap.values()) {
      if (fieldState) touched += fieldState.touched;
    }
    return touched;
  }

  /**
   * Number of times form values have been changed by any means (by user and api calls e.g. `setValue`).
   */
  get changed(): number {
    let changed = 0;
    for (const fieldState of this._stateMap.values()) {
      if (fieldState) changed += fieldState.changed;
    }
    return changed;
  }

  /**
   * Number of times form fields have been blurred (with handleBlur).
   */
  get blurred(): number {
    let blurred = 0;
    for (const fieldState of this._stateMap.values()) {
      if (fieldState) blurred += fieldState.blurred;
    }
    return blurred;
  }

  /**
   * Returns `true` if at least one field has error.
   */
  get hasErrors(): boolean {
    for (const fieldState of this._stateMap.values()) {
      if (fieldState?.error) return true;
    }
    return false;
  }

  /**
   * Returns `true` if at least one field has warning.
   */
  get hasWarnings(): boolean {
    for (const fieldState of this._stateMap.values()) {
      if (fieldState?.warning) return true;
    }
    return false;
  }

  /**
   * Returns form options.
   * Should not be changed directly.
   * Use `setOptions` to change options.
   */
  getOptions(): FormOptions<FV> {
    return this._options;
  }

  /**
   * Overrides provided form options.
   * Returns full form options.
   */
  setOptions(formOptions: Partial<FormOptions<FV>>): FormOptions<FV> {
    return Object.assign(this._options, formOptions);
  }

  /**
   * Clears all field states. Internal without rerender.
   */
  protected _clearState(): FormField<FV>[] {
    const fields = [...this._stateMap.keys()];
    this._stateMap.clear();
    this._internalStateMap.clear();

    return fields;
  }

  // region FieldRerender

  /**
   * Loops through `fields` or all fields if `fields` is not passed and calls `_rerenderField` for each field.
   * Is used when fields value or state changed.
   */
  protected _rerenderFields(
    fields?: Iterable<FormField<FV>>,
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    for (const field of fields || new Set([...this._stateMap.keys(), ...this._valuesMap.keys()])) {
      this._rerenderField(field, rerenderOptions);
    }
  }

  /**
   * This is used after value or state changed.
   * Should be overriden in subclass for reactivity.
   */
  // eslint-disable-next-line
  protected _rerenderField(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): void {}

  // region FieldState

  /**
   * Clears field state.
   * Messages, error, warning are dropped including custom messages and forced error / warning.
   * Returns `true` if there was a state for passed field.
   */
  clearFieldState(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): boolean {
    const deleted = this._clearFieldState(field);
    this._rerenderField(field, rerenderOptions);
    return deleted;
  }

  /**
   * Gets field state.
   * Creates empty one if none found:
   *
   * `{ touched: 0, changed: 0, blurred: 0, error: false, warning: false }`
   *
   * Should not be changed directly.
   */
  getFieldState(field: FormField<FV>): FormFieldState {
    return this._ensureFieldState(field);
  }

  /**
   * Forces permanent field error, no matter validation results change.
   *
   * To unforce use one of `unforceFieldError`, `clearFieldState`, `clearState`, `clear`, `reset`
   */
  forceFieldError(
    field: FormField<FV>,
    error: boolean,
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    this._ensureInternalFieldState(field).errorOverride = error;
    this._ensureFieldState(field).error = error;
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Forces permanent field warning, no matter validation results change.
   *
   * To unforce use one of `unforceFieldWarning`, `clearFieldState`, `clearState`, `clear`, `reset`
   */
  forceFieldWarning(
    field: FormField<FV>,
    warning: boolean,
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    this._ensureInternalFieldState(field).warningOverride = warning;
    this._ensureFieldState(field).warning = warning;
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears permanent error override and recalculates error based on existing messages.
   */
  unforceFieldError(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): void {
    delete this._ensureInternalFieldState(field).errorOverride;
    this._updateFieldMessages(field, 'onlyError');
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears permanent warning override and recalculates warning based on existing messages.
   */
  unforceFieldWarning(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): void {
    delete this._ensureInternalFieldState(field).warningOverride;
    this._updateFieldMessages(field, 'onlyWarning');
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears all field messages (validation and custom), error, warning.
   */
  clearFieldMessages(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): void {
    this._clearFieldMessages(field);
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears validation field messages (that can exist only as result of field validation).
   * Custom field messages are kept intact.
   */
  clearFieldValidationMessages(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): void {
    this._clearFieldValidationMessages(field);
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears custom field messages. Validation messages are kept intact.
   */
  clearFieldCustomMessages(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): void {
    this._clearFieldCustomMessages(field);
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Adds custom field messages. Previous field messages are kept intact.
   * These are separate from potential validation messages.
   */
  addFieldCustomMessages(
    field: FormField<FV>,
    messages: FormFieldMessage[],
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    this._addFieldCustomMessages(field, messages);
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears and adds new custom field messages. Validation messages are kept intact.
   */
  resetFieldCustomMessages(
    field: FormField<FV>,
    messages: FormFieldMessage[],
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    this._resetFieldCustomMessages(field, messages);
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Clears all field messages (validation and custom), error, warning.
   * Internal without rerender.
   */
  protected _clearFieldMessages(field: FormField<FV>): void {
    const internalFieldState = this._ensureInternalFieldState(field);
    delete internalFieldState.requiredMessage;
    delete internalFieldState.rulesMessages;
    delete internalFieldState.customMessages;
    this._updateFieldMessages(field);
  }

  /**
   * Clears validation field messages (that can exist only as result of field validation).
   * Custom field messages are kept intact.
   * Internal without rerender.
   */
  protected _clearFieldValidationMessages(field: FormField<FV>): void {
    const internalFieldState = this._ensureInternalFieldState(field);
    delete internalFieldState.requiredMessage;
    delete internalFieldState.rulesMessages;
    this._updateFieldMessages(field);
  }

  /**
   * Clears custom field messages. Validation messages are kept intact.
   * Internal without rerender.
   */
  protected _clearFieldCustomMessages(field: FormField<FV>): void {
    const internalFieldState = this._ensureInternalFieldState(field);
    delete internalFieldState.customMessages;
    this._updateFieldMessages(field);
  }

  /**
   * Adds custom field messages. Previous field messages are kept intact.
   * These are separate from potential validation messages.
   * Internal without rerender.
   */
  protected _addFieldCustomMessages(field: FormField<FV>, messages: FormFieldMessage[]): void {
    const internalFieldState = this._ensureInternalFieldState(field);
    internalFieldState.customMessages = internalFieldState.customMessages || [];
    internalFieldState.customMessages.push(...messages);
    this._updateFieldMessages(field);
  }

  /**
   * Clears and adds new custom field messages. Validation messages are kept intact.
   * Internal without rerender.
   */
  protected _resetFieldCustomMessages(field: FormField<FV>, messages: FormFieldMessage[]): void {
    this._ensureInternalFieldState(field).customMessages = [...messages];
    this._updateFieldMessages(field);
  }

  /**
   * Gets field state.
   * Creates empty one if none found:
   *
   * `{ touched: 0, changed: 0, blurred: 0, error: false, warning: false }`
   */
  protected _ensureFieldState(field: FormField<FV>): FormFieldState {
    let fieldState = this._stateMap.get(field);
    if (!fieldState) {
      fieldState = {
        touched: 0,
        changed: 0,
        blurred: 0,
        error: false,
        warning: false,
      };
      this._stateMap.set(field, fieldState);
    }
    return fieldState;
  }

  /**
   * Gets internal field state.
   * Creates empty one if none found: `{}`
   */
  protected _ensureInternalFieldState(field: FormField<FV>): FormFieldInternalState {
    let internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) {
      internalFieldState = {};
      this._internalStateMap.set(field, internalFieldState);
    }
    return internalFieldState;
  }

  /**
   * Clears field state.
   * Messages, error, warning are dropped including custom messages and forced error / warning.
   * Returns `true` if there was a state for passed field.
   * Internal without rerender.
   */
  protected _clearFieldState(field: FormField<FV>): boolean {
    this._internalStateMap.delete(field);
    return this._stateMap.delete(field);
  }

  /**
   * Loops through internalFieldState messages
   * to build new messages array as their concatenation to set to `fieldState.messages`.
   *
   * Also sets `fieldState.error` and `fieldState.warning`
   * based on `errorOverride`, `warningOverride` and all messages `type`.
   *
   * Pass `only` to loop only for `error` or `warning`.
   */
  protected _updateFieldMessages(field: FormField<FV>, only?: 'onlyError' | 'onlyWarning'): void {
    const fieldState = this._ensureFieldState(field);
    const { requiredMessage, rulesMessages, customMessages, errorOverride, warningOverride } =
      this._ensureInternalFieldState(field);

    if (!only) delete fieldState.messages;
    if (only !== 'onlyWarning') fieldState.error = errorOverride ?? false;
    if (only !== 'onlyError') fieldState.warning = warningOverride ?? false;

    const processInternalMessage = (message: FormFieldMessage) => {
      if (!only) {
        fieldState.messages = fieldState.messages || [];
        fieldState.messages.push(message);
      }
      if (only !== 'onlyWarning') {
        fieldState.error = errorOverride ?? (fieldState.error || message.type === 'error');
      }
      if (only !== 'onlyError') {
        fieldState.warning = warningOverride ?? (fieldState.warning || message.type === 'warning');
      }
    };

    if (requiredMessage) processInternalMessage(requiredMessage);
    if (rulesMessages) {
      for (const message of rulesMessages) {
        if (message) processInternalMessage(message);
      }
    }
    if (customMessages) {
      for (const message of customMessages) {
        if (message) processInternalMessage(message);
      }
    }
  }

  // region Values

  /**
   * Gets field value.
   */
  getValue<F extends FormField<FV> = FormField<FV>>(field: F): FV[F] {
    return this._valuesMap.get(field);
  }

  /**
   * Gets fields values.
   * If `fields` provided - returns values only for them.
   * If not - returns all fields values.
   *
   * It is better to use `getValues(['a', 'b'])`
   * than `getValues().a` `getValues().b`
   * performance wise.
   */
  getValues<FA extends readonly FormField<FV>[] = readonly FormField<FV>[]>(
    fields?: FA,
  ): typeof fields extends undefined ? FV : Pick<FV, FA[number]> {
    const valuesMap = this._valuesMap;

    if (!fields) return Object.fromEntries(valuesMap) as FV;

    const result = {} as Pick<FV, FA[number]>;
    for (const field of fields) {
      result[field] = valuesMap.get(field);
    }
    return result;
  }

  /**
   * Sets field value with validation and other calculations.
   * Provide `options` to control things happening other than setting value.
   */
  setValue<F extends FormField<FV> = FormField<FV>>(field: F, value: FV[F], options?: O): void {
    this._valuesMap.set(field, value);
    this._onAfterValueChange(field, options);
  }

  /**
   * Sets fields values with validation and other calculations.
   * Provide `options` to control things happening other than setting values.
   */
  setValues(values: Partial<FV>, options?: O): void {
    this._setValues(values);
    this._onAfterValuesChange(Object.keys(values) as FormField<FV>[], options);
  }

  /**
   * Clears all fields values with validation and other calculations.
   * Provide `options` to control things happening other than clearing values.
   */
  clearValues(options?: O): void {
    this._onAfterValuesChange(this._clearValues(), options);
  }

  /**
   * Clears all previous fields values and sets provided ones.
   * Validation, state change, rerender happen for previous and new fields combined.
   * If field was there and provided again above things happen to it once.
   */
  resetValues(values: FV, options?: O): void {
    this._onAfterValuesChange(this._resetValues(values), options);
  }

  /**
   * Internal simple fields values setter. Without validation, state change, rerender.
   */
  protected _setValues(values: Partial<FV>): void {
    for (const field in values) {
      this._valuesMap.set(field, values[field]);
    }
  }

  /**
   * Clears fields values. Returns fields that had values.
   * Without validation, state change, rerender.
   */
  protected _clearValues(): FormField<FV>[] {
    const fields = [...this._valuesMap.keys()];
    this._valuesMap.clear();
    return fields;
  }

  /**
   * Clears fields values and sets new ones.
   * Returns unique fields Set that were cleared or added.
   * Without validation, state change, rerender.
   */
  protected _resetValues(values: FV): Set<FormField<FV>> {
    const fieldSet = new Set(this._clearValues());

    for (const field in values) {
      this._valuesMap.set(field, values[field]);
      fieldSet.add(field);
    }

    return fieldSet;
  }

  /**
   * Is triggered after field value changes.
   * Changes state, triggeres validation and rerender.
   */
  protected _onAfterValueChange(field: FormField<FV>, options?: O): void {
    const { byUser, skipChangeUpdate, skipValidation, ...rerenderOptions } = (options || {}) as O;

    if (!skipChangeUpdate) {
      const fieldState = this._ensureFieldState(field);
      fieldState.changed++;
      if (byUser) fieldState.touched++;
    }

    if (!skipValidation) {
      const passedMaybePromise = this._validateField(field, byUser ? 'onTouch' : 'onChange');
      if (passedMaybePromise instanceof Promise) {
        passedMaybePromise.then(() => this._rerenderField(field, rerenderOptions));
      }
    }

    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Is triggered after multiple fields values change.
   * Changes their states, triggeres their validation.
   * Triggeres all fields rerender after all states change and all validation.
   * In that regard it is different than looping through fields and calling `_onAfterValueChange` for each one.
   */
  protected _onAfterValuesChange(fields: Iterable<FormField<FV>>, options?: O): void {
    const { byUser, skipChangeUpdate, skipValidation, ...rerenderOptions } = (options || {}) as O;

    if (!skipChangeUpdate) {
      for (const field of fields) {
        const fieldState = this._ensureFieldState(field);
        fieldState.changed++;
        if (byUser) fieldState.touched++;
      }
    }

    if (!skipValidation) {
      const passedMaybePromise = this._validate(fields, byUser ? 'onTouch' : 'onChange');
      if (passedMaybePromise instanceof Promise) {
        passedMaybePromise.then(() => this._rerenderFields(fields, rerenderOptions));
      }
    }

    this._rerenderFields(fields, rerenderOptions);
  }

  // region DOM

  /**
   * Simple wrapper around `setValue` with `byUser: true`.
   * Should be used on `input` event of input field.
   * Form will set value, trigger `onTouch` validation, etc.
   *
   * `InputEvent` object must be provided as second argument.
   * Value will be taken from it as `event.target.value` or `event.target.checked` for checkbox input.
   * Generic `{ target: { value: '...' } }` is acceptable.
   *
   * Supposed to be used with `handleBlur`.
   */
  handleChange(field: FormField<FV>, event: any, options?: O): void {
    if (!event || typeof event !== 'object') return;

    const el = event.target;
    if (!el || typeof el !== 'object') return;

    const value = el.type === 'checkbox' ? el.checked : el.value;

    this.setValue(field, value, { byUser: true, ...options } as O);
  }

  /**
   * Should be used on `blur` event of input field.
   * Increments `blurred` state and trigger `onBlur` validation.
   *
   * Supposed to be used with `handleChange`.
   */
  handleBlur(field: FormField<FV>, options?: O): void {
    // eslint-disable-next-line
    const { byUser, skipChangeUpdate, skipValidation, ...rerenderOptions } = (options || {}) as O;

    const fieldState = this._ensureFieldState(field);
    if (!skipChangeUpdate) fieldState.blurred++;
    if (!skipValidation) this.validateField(field, 'onBlur', rerenderOptions);
  }

  // region Validate

  /**
   * Triggers field validation for specific event.
   *
   * Pass `eventName` to trigger only validation specified for that event, default `'all'`.
   *
   * Returns promise only if encounters promisified validate function.
   *
   * If any validate function throws an error be it sync or async -
   * catches error and considers it not passed (as if it returned `false`).
   */
  validateField(
    field: FormField<FV>,
    eventName?: FormValidationEventName,
    rerenderOptions?: RerenderOptions<O>,
  ): boolean | Promise<boolean> {
    const passedMaybePromise = this._validateField(field, eventName);

    if (passedMaybePromise instanceof Promise) {
      return passedMaybePromise.then((passed) => {
        this._rerenderField(field, rerenderOptions);
        return passed;
      });
    }

    this._rerenderField(field, rerenderOptions);
    return passedMaybePromise;
  }

  /**
   * Triggers multiple fields validation for specific event.
   *
   * If `fields` is not provided - trigger validation for all fields that have validation.
   *
   * Pass `eventName` to trigger only validation specified for that event, default `'all'`.
   *
   * Returns promise only if encounters promisified validate function.
   *
   * If any validate function throws an error be it sync or async -
   * catches error and considers it not passed (as if it returned `false`).
   *
   * Triggers all fields rerender after all validation processed.
   *
   * If validation results in promise - await it and rerender after.
   */
  validate(
    fields?: Iterable<FormField<FV>>,
    eventName?: FormValidationEventName,
    rerenderOptions?: RerenderOptions<O>,
  ): boolean | Promise<boolean> {
    const passedMaybePromise = this._validate(fields, eventName);

    if (passedMaybePromise instanceof Promise) {
      return passedMaybePromise.then((passed) => {
        this._rerenderFields(fields, rerenderOptions);
        return passed;
      });
    }

    this._rerenderFields(fields, rerenderOptions);
    return passedMaybePromise;
  }

  /**
   * Internal main field validation logic.
   *
   * Pass `eventName` to trigger only validation specified for that event, default `'all'`.
   *
   * Returns promise only if at least one rule validate function is promisified.
   */
  protected _validateField(
    field: FormField<FV>,
    eventName: FormValidationEventName = 'all',
  ): boolean | Promise<boolean> {
    const fieldValidation = this._validationMap.get(field);
    if (!fieldValidation) return true;

    const internalFieldState = this._ensureInternalFieldState(field);
    const rulesMessages = (internalFieldState.rulesMessages =
      internalFieldState.rulesMessages || []);

    let promisified = false;
    let needUpdate = false;
    const results: (boolean | Promise<boolean>)[] = [];

    const validateRule = (rule: FormFieldValidationRule<FV>, index: number | 'required') => {
      if (eventName !== 'all') {
        const ruleEventName =
          rule.eventName ||
          fieldValidation.eventName ||
          this._options.validationEventName ||
          FORM_CTRL_DEFAULTS.validationEventName;

        if (
          ruleEventName !== 'all' &&
          ruleEventName !== eventName &&
          (eventName !== 'onTouch' || ruleEventName !== 'onChange')
        )
          return;
      }

      let passedMaybePromise: boolean | Promise<boolean> = false;

      try {
        if (rule.validate) {
          passedMaybePromise = rule.validate(
            this.getValue(field),
            rule.needMoreValues
              ? this.getValues(rule.needMoreValues === true ? undefined : rule.needMoreValues)
              : undefined,
          );
        }
      } catch {
        // no-op
      }

      const processPassed = (passed: boolean) => {
        const msgType = passed ? rule.typeIfPassed : rule.type || 'error';

        if (msgType) {
          const message = {
            message: rule.message,
            type: msgType,
          };

          if (index === 'required') {
            if (!shallowEqual(internalFieldState.requiredMessage, message)) {
              internalFieldState.requiredMessage = message;
              needUpdate = true;
            }
          } else {
            if (!shallowEqual(rulesMessages[index], message)) {
              rulesMessages[index] = message;
              needUpdate = true;
            }
          }
        } else {
          if (index === 'required') {
            if (internalFieldState.requiredMessage) {
              delete internalFieldState.requiredMessage;
              needUpdate = true;
            }
          } else {
            if (rulesMessages[index]) {
              delete rulesMessages[index];
              needUpdate = true;
            }
          }
        }

        // to be sure
        return Boolean(passed);
      };

      let result;
      if (passedMaybePromise instanceof Promise) {
        promisified = true;
        result = passedMaybePromise.catch(() => false).then(processPassed);
      } else {
        result = processPassed(passedMaybePromise);
      }

      results.push(result);
    };

    // required validation
    if (fieldValidation.required) {
      const required = fieldValidation.required;

      const requiredRule: FormFieldValidationRule<FV> =
        typeof required === 'object' ? required : { type: 'error' };

      if (typeof required !== 'object') {
        requiredRule.validate =
          fieldValidation.requiredValidate ||
          this._options.requiredValidate ||
          FORM_CTRL_DEFAULTS.requiredValidate;
        requiredRule.message =
          typeof required === 'string'
            ? required
            : this._options.requiredMessage || FORM_CTRL_DEFAULTS.requiredMessage;
      }

      validateRule(requiredRule, 'required');
    }

    // rules validation
    // more optimal this way instead of forEach
    const rules = fieldValidation.rules;
    if (rules) {
      const len = rules.length;
      for (let i = 0; i < len; i++) {
        const rule = rules[i];
        if (rule) validateRule(rule, i);
      }
    }

    // todo dependents

    if (promisified) {
      const processBools = needUpdate
        ? (bools: boolean[]) => {
            this._updateFieldMessages(field);
            return everyTruthy(bools);
          }
        : everyTruthy;

      return Promise.all(results).then(processBools);
    }

    if (needUpdate) this._updateFieldMessages(field);
    return everyTruthy(results as boolean[]);
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
    fields?: Iterable<FormField<FV>>,
    eventName?: FormValidationEventName,
  ): boolean | Promise<boolean> {
    let promisified = false;
    const allResults = [];

    for (const field of fields || this._validationMap.keys()) {
      const passedMaybePromise = this._validateField(field, eventName);

      if (passedMaybePromise instanceof Promise) promisified = true;

      allResults.push(passedMaybePromise);
    }

    return promisified ? Promise.all(allResults).then(everyTruthy) : everyTruthy(allResults);
  }

  // region Validation

  /**
   * Gets field validation settings. Returns `undefined` if there are no settings.
   *
   * Settings should not be changed directly.
   *
   * To change settings use `setFieldValidation`, `resetFieldValidation`, `clearFieldValidation`, `addFieldValidationRules`.
   */
  getFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
  ): FormFieldValidation<FV, F> | undefined {
    return this._validationMap.get(field);
  }

  /**
   * Ensures field validation settings and adds provided rules to it.
   * Previous rules, if there were any, are kept intact.
   */
  addFieldValidationRules<F extends FormField<FV> = FormField<FV>>(
    field: F,
    rules: FormFieldValidationRule<FV, F>[],
  ): void {
    // In this one there are no validation messages drop and no rerender.
    // It is intentional.
    // Adding rules to the end of rules array doesnt break previous rules and their messages.
    const fieldValidation = this._ensureFieldValidation(field);
    fieldValidation.rules = fieldValidation.rules || [];
    fieldValidation.rules.push(...rules);
  }

  /**
   * Clears field validation settings.
   * Returns `true` if there were settings, `false` otherwise.
   */
  clearFieldValidation(field: FormField<FV>, rerenderOptions?: RerenderOptions<O>): boolean {
    const deleted = this._clearFieldValidation(field);
    this._rerenderField(field, rerenderOptions);
    return deleted;
  }

  /**
   * Ensures field validation settings and overrides provided params in it.
   * Rules will be fully overriden.
   * To add validation rules without full override use `addFieldValidationRules`.
   * Returns full field validation settings.
   */
  setFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
    partialFieldValidation: Partial<FormFieldValidation<FV, F>>,
    rerenderOptions?: RerenderOptions<O>,
  ): FormFieldValidation<FV, F> {
    const fieldValidation = this._setFieldValidation(field, partialFieldValidation);
    this._rerenderField(field, rerenderOptions);
    return fieldValidation;
  }

  /**
   * Overrides field validation settings with provided ones.
   */
  resetFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
    fieldValidation: FormFieldValidation<FV, F>,
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    this._resetFieldValidation(field, fieldValidation);
    this._rerenderField(field, rerenderOptions);
  }

  /**
   * Gets copy of all fields validation settings.
   */
  getValidation(): FormValidation<FV> {
    return Object.fromEntries(this._validationMap) as FormValidation<FV>;
  }

  /**
   * Clears all fields validation settings.
   * Returns fields that had one.
   */
  clearValidation(rerenderOptions?: RerenderOptions<O>): FormField<FV>[] {
    const fieldsIterator = this._clearValidation();
    this._rerenderFields(fieldsIterator, rerenderOptions);
    return [...fieldsIterator];
  }

  /**
   * Overrides validation settings for provided fields.
   * Other fields validation settings are kept intact.
   */
  setValidation(
    someFieldsValidation: Partial<FormValidation<FV>>,
    rerenderOptions?: RerenderOptions<O>,
  ): void {
    this._rerenderFields(this._setValidation(someFieldsValidation), rerenderOptions);
  }

  /**
   * Clears all fields validation settings and sets provided ones.
   * Returns fields that had one (dropped and overriden).
   */
  resetValidation(
    allFieldsValidation: FormValidation<FV>,
    rerenderOptions?: RerenderOptions<O>,
  ): FormField<FV>[] {
    const clearedFields = this._clearValidation();
    this._rerenderFields(
      new Set([...clearedFields, ...this._setValidation(allFieldsValidation)]),
      rerenderOptions,
    );
    return [...clearedFields];
  }

  /**
   * Gets field validation settings. If there is none creates empty ones: `{}`
   */
  protected _ensureFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
  ): FormFieldValidation<FV, F> {
    let fieldValidation = this.getFieldValidation(field);
    if (!fieldValidation) {
      fieldValidation = {};
      this._validationMap.set(field, fieldValidation as FormFieldValidation<FV>);
    }
    return fieldValidation;
  }

  /**
   * Clears field validation settings.
   * Returns `true` if there were settings, `false` otherwise.
   *
   * Internal without rerender.
   */
  protected _clearFieldValidation(field: FormField<FV>): boolean {
    const result = this._validationMap.delete(field);
    this._clearFieldValidationMessages(field);
    return result;
  }

  /**
   * Ensures field validation settings and overrides provided params in it.
   * Rules will be fully overriden.
   * To add validation rules without full override use `addFieldValidationRules`.
   * Returns full field validation settings.
   *
   * Internal without rerender.
   */
  protected _setFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
    partialFieldValidation: Partial<FormFieldValidation<FV, F>>,
  ): FormFieldValidation<FV, F> {
    const fieldValidation = Object.assign(
      this._ensureFieldValidation(field),
      partialFieldValidation,
    );
    this._clearFieldValidationMessages(field);
    return fieldValidation;
  }

  /**
   * Overrides field validation settings with provided ones.
   *
   * Internal without rerender.
   */
  protected _resetFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
    fieldValidation: FormFieldValidation<FV, F>,
  ): void {
    this._validationMap.set(field, fieldValidation as FormFieldValidation<FV>);
    this._clearFieldValidationMessages(field);
  }

  /**
   * Clears all fields validation settings.
   * Returns fields that had one.
   *
   * Internal without rerender.
   */
  protected _clearValidation(): FormField<FV>[] {
    const fieldsWithValidation = [...this._validationMap.keys()];
    this._validationMap.clear();
    for (const field of fieldsWithValidation) {
      this._clearFieldValidationMessages(field);
    }
    return fieldsWithValidation;
  }

  /**
   * Overrides validation settings for provided fields. Other fields validation settings are kept intact.
   *
   * Internal without rerender.
   */
  protected _setValidation(someFieldsValidation: Partial<FormValidation<FV>>): FormField<FV>[] {
    const fields = Object.keys(someFieldsValidation) as FormField<FV>[];
    for (const field of fields) {
      if (someFieldsValidation[field]) {
        this._validationMap.set(field, someFieldsValidation[field]);
        this._clearFieldValidationMessages(field);
      }
    }
    return fields;
  }

  /**
   * Clears all fields validation settings and sets provided ones.
   * Returns all fields uniq set (dropped, overriden, new).
   *
   * Internal without rerender.
   */
  protected _resetValidation(allFieldsValidation: FormValidation<FV>): Set<FormField<FV>> {
    return new Set([...this._clearValidation(), ...this._setValidation(allFieldsValidation)]);
  }
}

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
  OnChangeOptions,
} from './types.js';
import { getElementsValue, getElementValue, setElementsValue, setElementValue } from './dom.js';

const formCtrlHolder = new Map<FormId, FormCtrl<any, any>>();

export const FORM_CTRL_DEFAULTS: {
  validationEventName: FormValidationEventName;
  requiredValidate: FormFieldRequiredValidate;
  requiredMessage?: string;
} = {
  validationEventName: 'onBlur',
  requiredValidate: (v) => v !== undefined && v !== null && v !== '' && v !== 0,
};

/**
 * Fields values, states, validation, DOM elements holder.
 * Most of logic happens here.
 */
export class FormCtrl<
  FV extends object = FormValues,
  O extends FormValuesSetterOptions = FormValuesSetterOptions,
> {
  readonly id: FormId;
  options: FormOptions<FV, O>;
  protected readonly _valuesMap: Map<FormField<FV>, any>;
  protected readonly _stateMap: Map<FormField<FV>, FormFieldState | undefined>;
  protected readonly _internalStateMap: Map<FormField<FV>, FormFieldInternalState | undefined>;
  protected readonly _validationMap: Map<FormField<FV>, FormFieldValidation<FV> | undefined>;
  protected readonly _elementMap: Map<FormField<FV>, HTMLElement | HTMLElement[] | undefined>;

  // region Constructor

  constructor(formId: FormId, constructorOptions: FormConstructorOptions<FV, O> = {}) {
    const { validation, values, register, ...options } = constructorOptions;
    this.id = formId;
    this.options = options;

    this._valuesMap = new Map();
    this._stateMap = new Map();
    this._internalStateMap = new Map();
    this._validationMap = new Map();
    this._elementMap = new Map();

    if (register) this.register(register);
    if (validation) this.setValidation(validation);
    if (values || options.defaultValues) this._setValues({ ...options.defaultValues, ...values });

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

  // region Form

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
   * Clears all fields states (messages, error, warning, touched, changed, blurred).
   * Clears values.
   *
   * Validation settings are not changed.
   * To clear validation settings use `clearValidation`.
   */
  clear(onChangeOptions?: OnChangeOptions<O>): void {
    this.clearState(onChangeOptions);
    this._clearValues(onChangeOptions);
  }

  /**
   * Clears all fields states (messages, error, warning, touched, changed, blurred).
   * Overrides field values with provided `newValues` or `defaultValues`.
   *
   * Validation settings are not changed.
   * To clear or reset validation settings use `clearValidation` or `resetValidation`.
   */
  reset(newValues?: FV, onChangeOptions?: OnChangeOptions<O>): void {
    this.clearState(onChangeOptions);
    this._resetValues(newValues, onChangeOptions);
  }

  /**
   * Removes form instance from internal store.
   */
  destroy(): boolean {
    return formCtrlHolder.delete(this.id);
  }

  // region OnChange

  protected _onValueChange<F extends FormField<FV> = FormField<FV>>(
    field: F,
    value: FV[F],
    prevValue: FV[F],
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    if (Object.is(value, prevValue)) return;
    this.options.onValueChange?.(field, value, prevValue, onChangeOptions);
  }

  protected _onMessagesChange(
    field: FormField<FV>,
    messages: FormFieldMessage[] | null,
    prevMessages: FormFieldMessage[] | null,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    if (Object.is(messages, prevMessages)) return;
    this.options.onMessagesChange?.(field, messages, prevMessages, onChangeOptions);
  }

  protected _onErrorChange(
    field: FormField<FV>,
    error: boolean,
    prevError: boolean,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    if (Object.is(error, prevError)) return;
    this.options.onErrorChange?.(field, error, prevError, onChangeOptions);
  }

  protected _onWarningChange(
    field: FormField<FV>,
    warning: boolean,
    prevWarning: boolean,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    if (Object.is(warning, prevWarning)) return;
    this.options.onWarningChange?.(field, warning, prevWarning, onChangeOptions);
  }

  /**
   * !! This is not triggered for every state change.
   * It is only for situational convenience.
   *
   * There is intentionally no state change handler because:
   * - it will be triggered very often, because of `touched` and `changed` counters
   * - creating additional state object clone for prevState arg
   * - most likely is not needed since there are messages, error, warning change handlers
   */

  // region FieldState

  /**
   * Gets field state.
   * Should not be changed directly.
   */
  getFieldState(field: FormField<FV>): FormFieldState {
    return this._ensureFieldState(field);
  }

  /**
   * Clears field state.
   * Messages, error, warning are dropped including custom messages and forced error / warning.
   * Returns `true` if there was a state for passed field.
   */
  clearFieldState(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): boolean {
    const prevFieldState = this._stateMap.get(field);

    this._internalStateMap.delete(field);
    const deleted = this._stateMap.delete(field);

    if (prevFieldState) {
      const { messages: prevMessages, error: prevError, warning: prevWarning } = prevFieldState;
      const { messages, error, warning } = this._getEmptyFieldState();
      this._onMessagesChange(field, messages, prevMessages, onChangeOptions);
      this._onErrorChange(field, error, prevError, onChangeOptions);
      this._onWarningChange(field, warning, prevWarning, onChangeOptions);
    }

    return deleted;
  }

  /**
   * Clears all field states.
   */
  clearState(onChangeOptions?: OnChangeOptions<O>): void {
    const {
      messages: emptyMessages,
      error: emptyError,
      warning: emptyWarning,
    } = this._getEmptyFieldState();

    for (const [field, fieldState] of this._stateMap) {
      if (!fieldState) continue;
      const { messages, error, warning } = fieldState;
      this._onMessagesChange(field, emptyMessages, messages, onChangeOptions);
      this._onErrorChange(field, emptyError, error, onChangeOptions);
      this._onWarningChange(field, emptyWarning, warning, onChangeOptions);
    }

    this._stateMap.clear();
    this._internalStateMap.clear();
  }

  incrementChanged(field: FormField<FV>, byUser?: boolean): void {
    const fieldState = this._ensureFieldState(field);
    fieldState.changed++;
    if (byUser) fieldState.touched++;
  }

  incrementBlurred(field: FormField<FV>): void {
    this._ensureFieldState(field).blurred++;
  }

  /**
   * Forces permanent field error, no matter validation results change.
   *
   * To unforce use one of `unforceFieldError`, `clearFieldState`, `clearState`, `clear`, `reset`
   */
  forceFieldError(
    field: FormField<FV>,
    error: boolean,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    this._ensureInternalFieldState(field).errorOverride = error;
    const fieldState = this._ensureFieldState(field);
    const prevError = fieldState.error;
    fieldState.error = error;
    this._onErrorChange(field, error, prevError, onChangeOptions);
  }

  /**
   * Forces permanent field warning, no matter validation results change.
   *
   * To unforce use one of `unforceFieldWarning`, `clearFieldState`, `clearState`, `clear`, `reset`
   */
  forceFieldWarning(
    field: FormField<FV>,
    warning: boolean,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    this._ensureInternalFieldState(field).warningOverride = warning;
    const fieldState = this._ensureFieldState(field);
    const prevWarning = fieldState.warning;
    fieldState.warning = warning;
    this._onWarningChange(field, warning, prevWarning, onChangeOptions);
  }

  /**
   * Clears permanent error override and recalculates error based on existing messages.
   */
  unforceFieldError(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): void {
    const internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) return;
    internalFieldState.errorOverride = null;
    this._updateFieldMessages(field, onChangeOptions, 'onlyError');
  }

  /**
   * Clears permanent warning override and recalculates warning based on existing messages.
   */
  unforceFieldWarning(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): void {
    const internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) return;
    internalFieldState.warningOverride = null;
    this._updateFieldMessages(field, onChangeOptions, 'onlyWarning');
  }

  /**
   * Clears all field messages (validation and custom), error, warning.
   */
  clearFieldMessages(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): void {
    const internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) return;
    internalFieldState.requiredMessage = null;
    internalFieldState.rulesMessages = null;
    internalFieldState.customMessages = null;
    this._updateFieldMessages(field, onChangeOptions);
  }

  /**
   * Clears validation field messages (that can exist only as result of field validation).
   * Custom field messages are kept intact.
   */
  clearFieldValidationMessages(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): void {
    const internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) return;
    internalFieldState.requiredMessage = null;
    internalFieldState.rulesMessages = null;
    this._updateFieldMessages(field, onChangeOptions);
  }

  /**
   * Clears custom field messages. Validation messages are kept intact.
   */
  clearFieldCustomMessages(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): void {
    const internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) return;
    internalFieldState.customMessages = null;
    this._updateFieldMessages(field, onChangeOptions);
  }

  /**
   * Adds custom field messages. Previous field messages are kept intact.
   * These are separate from potential validation messages.
   */
  addFieldCustomMessages(
    field: FormField<FV>,
    messages: FormFieldMessage[],
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    const internalFieldState = this._ensureInternalFieldState(field);
    internalFieldState.customMessages = internalFieldState.customMessages || [];
    internalFieldState.customMessages.push(...messages);
    this._updateFieldMessages(field, onChangeOptions);
  }

  /**
   * Clears and adds new custom field messages. Validation messages are kept intact.
   */
  resetFieldCustomMessages(
    field: FormField<FV>,
    messages: FormFieldMessage[],
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    this._ensureInternalFieldState(field).customMessages = [...messages];
    this._updateFieldMessages(field, onChangeOptions);
  }

  /**
   * Clears all messages for specified fields, or for all fields if `fields` is not passed.
   */
  clearMessages(fields?: Iterable<FormField<FV>>, onChangeOptions?: OnChangeOptions<O>): void {
    for (const field of fields || this._internalStateMap.keys()) {
      this.clearFieldMessages(field, onChangeOptions);
    }
  }

  /**
   * Clears validation messages for specified fields, or for all fields if `fields` is not passed.
   */
  clearValidationMessages(
    fields?: Iterable<FormField<FV>>,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    for (const field of fields || this._internalStateMap.keys()) {
      this.clearFieldValidationMessages(field, onChangeOptions);
    }
  }

  /**
   * Clears custom messages for specified fields, or for all fields if `fields` is not passed.
   */
  clearCustomMessages(
    fields?: Iterable<FormField<FV>>,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    for (const field of fields || this._internalStateMap.keys()) {
      this.clearFieldCustomMessages(field, onChangeOptions);
    }
  }

  /**
   * Gets new empty `fieldState`
   */
  protected _getEmptyFieldState(): FormFieldState {
    // null for consistent object structure
    return {
      touched: 0,
      changed: 0,
      blurred: 0,
      error: false,
      warning: false,
      messages: null,
    };
  }

  /**
   * Gets new empty `internalFieldState`
   */
  protected _getEmptyInternalFieldState(): FormFieldInternalState {
    // nulls for consistent object structure
    return {
      requiredMessage: null,
      rulesMessages: null,
      customMessages: null,
      errorOverride: null,
      warningOverride: null,
    };
  }

  /**
   * Gets field state. Creates empty one if none found.
   */
  protected _ensureFieldState(field: FormField<FV>): FormFieldState {
    let fieldState = this._stateMap.get(field);
    if (!fieldState) {
      fieldState = this._getEmptyFieldState();
      this._stateMap.set(field, fieldState);
    }
    return fieldState;
  }

  /**
   * Gets internal field state. Creates empty one if none found.
   */
  protected _ensureInternalFieldState(field: FormField<FV>): FormFieldInternalState {
    let internalFieldState = this._internalStateMap.get(field);
    if (!internalFieldState) {
      internalFieldState = this._getEmptyInternalFieldState();
      this._internalStateMap.set(field, internalFieldState);
    }
    return internalFieldState;
  }

  /**
   * Loops through internalFieldState messages
   * to build new messages array as their concatenation to set to `fieldState.messages`.
   *
   * Also sets `fieldState.error` and `fieldState.warning`
   * based on `errorOverride`, `warningOverride` and all messages `type`.
   *
   * Triggers `onMessagesChange`, `onErrorChange`, `onWarningChange` after everything is set.
   *
   * Pass `only` to loop only for `error` or `warning`.
   */
  protected _updateFieldMessages(
    field: FormField<FV>,
    onChangeOptions?: OnChangeOptions<O>,
    only?: 'onlyError' | 'onlyWarning',
  ): void {
    const fieldState = this._ensureFieldState(field);
    const { requiredMessage, rulesMessages, customMessages, errorOverride, warningOverride } =
      this._ensureInternalFieldState(field);

    const { messages: prevMessages, error: prevError, warning: prevWarning } = fieldState;

    if (!only) fieldState.messages = null;
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

    const { messages, error, warning } = fieldState;

    this._onMessagesChange(field, messages, prevMessages, onChangeOptions);
    this._onErrorChange(field, error, prevError, onChangeOptions);
    this._onWarningChange(field, warning, prevWarning, onChangeOptions);
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
    const onChangeOptions = this._extractOnChangeOptions(options);
    this._setValue(field, value, onChangeOptions);
    this._processValueChange(field, options);
  }

  /**
   * Sets fields values with validation and other calculations.
   * Provide `options` to control things happening other than setting values.
   */
  setValues(values: Partial<FV>, options?: O): void {
    const onChangeOptions = this._extractOnChangeOptions(options);
    const fields = this._setValues(values, onChangeOptions);
    this._processValuesChange(fields, options);
  }

  /**
   * Clears all fields values with validation and other calculations.
   * Provide `options` to control things happening other than clearing values.
   */
  clearValues(options?: O): void {
    const onChangeOptions = this._extractOnChangeOptions(options);
    const fields = this._clearValues(onChangeOptions);
    this._processValuesChange(fields, options);
  }

  /**
   * Clears old values and sets provided `newValues` or `defaultValues`.
   * Validation, state change, onValueChange happen for previous and new fields combined.
   * If field was there and provided again these things happen to it once.
   */
  resetValues(newValues?: FV, options?: O): void {
    const onChangeOptions = this._extractOnChangeOptions(options);
    const fields = this._resetValues(newValues, onChangeOptions);
    this._processValuesChange(fields, options);
  }

  protected _extractOnChangeOptions(options?: O): OnChangeOptions<O> | undefined {
    if (!options) return;

    // eslint-disable-next-line
    const { byUser, skipChangeUpdate, skipValidation, ...onChangeOptions } = options;
    return onChangeOptions;
  }

  /**
   * Sets value and triggers onValueChange.
   * Without validation and state change.
   */
  protected _setValue<F extends FormField<FV> = FormField<FV>>(
    field: F,
    value: FV[F],
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    const prevValue = this._valuesMap.get(field);
    this._valuesMap.set(field, value);
    this._setValueToDOM(field, value);
    this._onValueChange(field, value, prevValue, onChangeOptions);
  }

  /**
   * Sets values and triggers onValueChange after all values set.
   * Without validation and state change.
   */
  protected _setValues(
    newValues: Partial<FV>,
    onChangeOptions?: OnChangeOptions<O>,
  ): FormField<FV>[] {
    const valuesMap = this._valuesMap;
    const fields: FormField<FV>[] = [];
    const prevValues: Partial<FV> = {};

    // set values and collect fields and previous values
    for (const field in newValues) {
      fields.push(field);
      prevValues[field] = valuesMap.get(field);

      const value = newValues[field] as FV[keyof FV];
      valuesMap.set(field, value);
      this._setValueToDOM(field, value);
    }

    // trigger onValueChange after all values are set
    for (const field of fields) {
      this._onValueChange(
        field,
        newValues[field] as FV[keyof FV],
        prevValues[field] as FV[keyof FV],
        onChangeOptions,
      );
    }

    return fields;
  }

  /**
   * Clears values and triggers onValueChange after everything is cleared.
   * Returns fields that had values.
   * Without validation and state change.
   */
  protected _clearValues(onChangeOptions?: OnChangeOptions<O>): Iterable<FormField<FV>> {
    const prevValuesMap = new Map(this._valuesMap);
    this._valuesMap.clear();
    for (const [field, value] of prevValuesMap) {
      this._onValueChange(field, undefined as any, value, onChangeOptions);
    }
    return prevValuesMap.keys();
  }

  /**
   * Clears old values and sets provided `newValues` or `defaultValues`.
   * Triggers onValueChange after everything is set.
   * Returns unique fields (without potential duplicates).
   * Without validation and state change.
   */
  protected _resetValues(
    newValues: FV | undefined = this.options.defaultValues,
    onChangeOptions?: OnChangeOptions<O>,
  ): Iterable<FormField<FV>> {
    if (!newValues) return this._clearValues(onChangeOptions);
    // reference for faster access
    const valuesMap = this._valuesMap;
    // save copy for prev values reference
    const prevValuesMap = new Map(valuesMap);
    // clear old and set new
    valuesMap.clear();
    for (const field in newValues) {
      valuesMap.set(field, newValues[field]);
    }

    // trigger onValueChange for all fields only once ignoring duplicates
    // additional loop for newValues to trigger onValueChange after everything is set
    // also fill array of unique fields
    const uniqFields: FormField<FV>[] = [];

    for (const [field, prevValue] of prevValuesMap) {
      if (Object.prototype.hasOwnProperty.call(newValues, field)) continue;

      uniqFields.push(field);
      this._onValueChange(field, undefined as any, prevValue, onChangeOptions);
    }

    for (const field in newValues) {
      const newValue = newValues[field];
      const prevValue = prevValuesMap.get(field);

      uniqFields.push(field);
      this._onValueChange(field, newValue, prevValue, onChangeOptions);
    }

    return uniqFields;
  }

  /**
   * Parse options, increment changed and validate.
   */
  protected _processValueChange(field: FormField<FV>, options?: O): void {
    // options most likely will find rare usage
    // this function might trigger often
    // more optimized this way
    if (options) {
      const { byUser, skipChangeUpdate, skipValidation, ...onChangeOptions } = options;
      if (!skipChangeUpdate) {
        this.incrementChanged(field, byUser);
      }
      if (!skipValidation) {
        this.validateField(field, byUser ? 'onTouch' : 'onChange', onChangeOptions);
      }
    } else {
      this.incrementChanged(field);
      this.validateField(field, 'onChange');
    }
  }

  /**
   * Parse options, increment changed and validate.
   */
  protected _processValuesChange(fields: Iterable<FormField<FV>>, options?: O): void {
    for (const field of fields) {
      this._processValueChange(field, options);
    }
  }

  // region DOM

  /**
   * Saves element(s) to internal store and adds event listeners to them.
   *
   * If element array is passed - field will be associated with all of them.
   * This is meant primarly for all radio or all checkboxes element groups.
   *
   * Returns unregister function, that removes from internal store and removes event listeners.
   */
  registerField(field: FormField<FV>, element: HTMLElement | HTMLElement[]) {
    this._setFieldElement(field, element);
    if (this._valuesMap.has(field)) this._setValueToDOM(field, this._valuesMap.get(field));

    // here it is important to pass element without wrapping to array
    const onInput = () => this._handleInput(field, element);
    const onBlur = () => this.handleBlur(field);

    // here wrapping can be done
    const elements = Array.isArray(element) ? element : [element];
    for (const el of elements) {
      el.addEventListener('input', onInput);
      el.addEventListener('blur', onBlur);
    }

    return () => {
      this._elementMap.delete(field);
      for (const el of elements) {
        el.removeEventListener('input', onInput);
        el.removeEventListener('blur', onBlur);
      }
    };
  }

  /**
   * Multiple `registerField`. Saves element(s) for each field and adds event listeners to them.
   *
   * If element array is passed - field will be associated with all of them.
   * This is meant primarly for all radio or all checkboxes element groups.
   *
   * Returns unregister function for each field,
   * that removes from internal store and removes event listeners.
   */
  register<F extends FormField<FV> = FormField<FV>>(
    elementsMap: Partial<Record<F, HTMLElement | HTMLElement[]>>,
  ) {
    const unregisterMap = {} as Partial<Record<F, () => void>>;

    for (const field in elementsMap) {
      const fieldElement = elementsMap[field as F];
      if (fieldElement) {
        unregisterMap[field] = this.registerField(field, fieldElement);
      }
    }

    return unregisterMap;
  }

  /**
   * Handles user input, should be used on `input` event of input field.
   *
   * If `event.target` exists it will be used to extract value.
   * Otherwise looks up for registered elements for that field and uses them.
   * If none found does nothing.
   */
  handleInput(field: FormField<FV>, event?: any): void {
    let element = event && typeof event === 'object' && event.target;
    if (!element || typeof element !== 'object') element = this._getFieldElement(field);
    if (element) this._handleInput(field, element);
  }

  /**
   * Should be used on `blur` event of input field.
   * Increments `blurred` state and triggers `onBlur` validation.
   */
  handleBlur(field: FormField<FV>): void {
    this.incrementBlurred(field);
    this.validateField(field, 'onBlur');
  }

  /**
   * Gets field html element(s) from internal store.
   * This method might be overriden in subclass.
   */
  protected _getFieldElement(field: FormField<FV>) {
    return this._elementMap.get(field);
  }

  /**
   * Sets field html element(s) to internal store.
   * This method might be overriden in subclass.
   */
  protected _setFieldElement(field: FormField<FV>, element: HTMLElement | HTMLElement[]) {
    this._elementMap.set(field, element);
  }

  /**
   * Sets element(s) value(s), triggers onValueChange, upd touched, validate onTouch.
   */
  protected _handleInput(field: FormField<FV>, element: HTMLElement | HTMLElement[]): void {
    const prevValue = this._valuesMap.get(field);
    const value = Array.isArray(element) ? getElementsValue(element) : getElementValue(element);

    this._valuesMap.set(field, value);
    this._onValueChange(field, value, prevValue);

    this.incrementChanged(field, true);
    this.validateField(field, 'onTouch');
  }

  /**
   * Sets field value to registered html element(s).
   */
  protected _setValueToDOM<F extends FormField<FV> = FormField<FV>>(field: F, value: FV[F]): void {
    const element = this._getFieldElement(field);
    if (!element) return;
    if (Array.isArray(element)) setElementsValue(element, value);
    else setElementValue(element, value);
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
    eventName: FormValidationEventName = 'all',
    onChangeOptions?: OnChangeOptions<O>,
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
          this.options.validationEventName ||
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
              internalFieldState.requiredMessage = null;
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
          this.options.requiredValidate ||
          FORM_CTRL_DEFAULTS.requiredValidate;
        requiredRule.message =
          typeof required === 'string'
            ? required
            : this.options.requiredMessage || FORM_CTRL_DEFAULTS.requiredMessage;
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
            this._updateFieldMessages(field, onChangeOptions);
            return everyTruthy(bools);
          }
        : everyTruthy;

      return Promise.all(results).then(processBools);
    }

    if (needUpdate) this._updateFieldMessages(field, onChangeOptions);
    return everyTruthy(results as boolean[]);
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
   */
  validate(
    fields?: Iterable<FormField<FV>>,
    eventName?: FormValidationEventName,
    onChangeOptions?: OnChangeOptions<O>,
  ): boolean | Promise<boolean> {
    let promisified = false;
    const allResults = [];

    for (const field of fields || this._validationMap.keys()) {
      const passedMaybePromise = this.validateField(field, eventName, onChangeOptions);

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
   * In contrast to other field validation manipulation methods
   * this one doesnt cause validation messages drop.
   */
  addFieldValidationRules<F extends FormField<FV> = FormField<FV>>(
    field: F,
    rules: FormFieldValidationRule<FV, F>[],
  ): void {
    // In this one there is no validation messages drop
    // Adding rules to the end of rules array doesnt break previous rules and their messages
    const fieldValidation = this._ensureFieldValidation(field);
    fieldValidation.rules = fieldValidation.rules || [];
    fieldValidation.rules.push(...rules);
  }

  /**
   * Clears field validation settings.
   * Returns `true` if there were settings, `false` otherwise.
   */
  clearFieldValidation(field: FormField<FV>, onChangeOptions?: OnChangeOptions<O>): boolean {
    const deleted = this._validationMap.delete(field);
    this.clearFieldValidationMessages(field, onChangeOptions);
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
    onChangeOptions?: OnChangeOptions<O>,
  ): FormFieldValidation<FV, F> {
    const fieldValidation = Object.assign(
      this._ensureFieldValidation(field),
      partialFieldValidation,
    );
    this.clearFieldValidationMessages(field, onChangeOptions);
    return fieldValidation;
  }

  /**
   * Overrides field validation settings with provided ones.
   */
  resetFieldValidation<F extends FormField<FV> = FormField<FV>>(
    field: F,
    fieldValidation: FormFieldValidation<FV, F>,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    this._validationMap.set(field, fieldValidation as FormFieldValidation<FV>);
    this.clearFieldValidationMessages(field, onChangeOptions);
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
  clearValidation(onChangeOptions?: OnChangeOptions<O>): FormField<FV>[] {
    const fields = [...this._validationMap.keys()];
    this._validationMap.clear();
    this.clearValidationMessages(fields, onChangeOptions);
    return fields;
  }

  /**
   * Overrides validation settings for provided fields.
   * Other fields validation settings are kept intact.
   */
  setValidation(
    someFieldsValidation: Partial<FormValidation<FV>>,
    onChangeOptions?: OnChangeOptions<O>,
  ): void {
    const fields: FormField<FV>[] = [];
    for (const field in someFieldsValidation) {
      const fieldValidation = someFieldsValidation[field as FormField<FV>];
      if (!fieldValidation) continue;
      fields.push(field);
      this._validationMap.set(field, fieldValidation);
    }
    this.clearValidationMessages(fields, onChangeOptions);
  }

  /**
   * Clears all fields validation settings and sets provided ones.
   * Returns fields that had one (dropped and overriden).
   */
  resetValidation(
    allFieldsValidation: FormValidation<FV>,
    onChangeOptions?: OnChangeOptions<O>,
  ): FormField<FV>[] {
    const fields = [...this._validationMap.keys()];

    this._validationMap.clear();
    for (const field in allFieldsValidation) {
      this._validationMap.set(field, allFieldsValidation[field as FormField<FV>]);
    }

    this.clearValidationMessages(undefined, onChangeOptions);
    return fields;
  }

  /**
   * Gets field validation settings. If there is none creates empty one.
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
}

export type FormId = unknown;

export type FormFieldMessageType = 'error' | 'warning' | 'success' | 'info';

export interface FormFieldMessage {
  message?: string;
  type?: FormFieldMessageType;
}

export type FormField = string | number | symbol;

export type FormValues = Record<FormField, unknown>;

export type FormFieldsMap<D = unknown> = Map<FormField, D>;

export type FormValidationEventName = 'onTouch' | 'onChange' | 'onBlur' | 'all';

export type FormFieldValidate<V = unknown> = (
  value: V,
  formValues?: FormValues,
) => boolean | Promise<boolean>;

export type FormFieldRequiredValidate<V = unknown> = (value: V) => boolean | Promise<boolean>;

export interface FormFieldValidationRule<V = unknown> extends FormFieldMessage {
  validate?: FormFieldValidate<V>;
  typeIfPassed?: FormFieldMessageType;
  needAllValues?: boolean;
  eventName?: FormValidationEventName;
}

export type FormFieldRequired<V> = boolean | string | FormFieldValidationRule<V>;

export interface FormFieldValidation<V = unknown> {
  eventName?: FormValidationEventName;
  rules?: FormFieldValidationRule<V>[];
  required?: FormFieldRequired<V>;
  requiredValidate?: FormFieldRequiredValidate<V>;
}

export type FormValidation = Record<FormField, FormFieldValidation>;

export interface FormOptions {
  validationEventName: FormValidationEventName;
  requiredValidate: FormFieldRequiredValidate;
  requiredMessage?: string;
}

export interface FormConstructorOptions extends Partial<FormOptions> {
  validation?: FormValidation;
  values?: FormValues;
}

export interface FormState {
  touched: number; // changed by user
  changed: number; // changed by any means
}

export interface FormFieldState {
  touched: number;
  changed: number;
  blurred: number;
  messages?: FormFieldMessage[];
  error?: boolean;
  warning?: boolean;
}

export interface FormFieldData<V = unknown> extends FormFieldState {
  value: V;
}

export interface FormValuesSetterOptions {
  byUser?: boolean;
  skipChangeUpdate?: boolean;
  skipRerender?: boolean;
  skipValidation?: boolean;
}

export interface FormStateSetterOptions {
  skipRerender?: boolean;
}

// region FormCtrl Class

export class FormCtrl {
  readonly id: FormId;
  protected readonly _options: FormOptions;
  protected readonly _state: FormState;
  protected readonly _valuesMap: FormFieldsMap;
  protected readonly _stateMap: FormFieldsMap<FormFieldState>;
  protected readonly _validationMap: FormFieldsMap<FormFieldValidation>;

  constructor(formId: FormId, options?: FormConstructorOptions);

  static get(formId: FormId): FormCtrl | undefined;

  static keys(): FormId[];

  destroy(): boolean;

  clear(clearValidation?: boolean): void;

  reset(values: FormValues, validation?: FormValidation): void;

  protected rerenderFields(fields?: FormField | FormField[]): void;

  // region FormState

  get touched(): number;

  get changed(): number;

  get hasErrors(): boolean;

  get hasWarnings(): boolean;

  get options(): FormOptions;

  set options(opts: Partial<FormOptions>);

  clearState(): void;

  // region FieldState

  clearFieldState(field: FormField): FormFieldState;

  getFieldState(field: FormField): FormFieldState;

  getFieldData<V = unknown>(field: FormField): FormFieldData<V>;

  protected _clearFieldMessages(fieldState: FormFieldState): void;

  protected _addFieldMessage(fieldState: FormFieldState, message: FormFieldMessage): void;

  clearFieldMessages(field: FormField, options?: FormStateSetterOptions): void;

  addFieldMessages(
    field: FormField,
    messages: FormFieldMessage | FormFieldMessage[],
    options?: FormStateSetterOptions,
  ): void;

  resetFieldMessages(
    field: FormField,
    messages: FormFieldMessage | FormFieldMessage[],
    options?: FormStateSetterOptions,
  ): void;

  // region Validation

  getFieldValidation(field: FormField): FormFieldValidation | undefined;

  clearFieldValidation(field: FormField): boolean;

  ensureFieldValidation(field: FormField): FormFieldValidation;

  addFieldValidationRules(field: FormField, rules: FormFieldValidationRule | FormFieldValidationRule[]): void;

  setFieldValidation(field: FormField, partialFieldValidation: Partial<FormFieldValidation>): void;

  resetFieldValidation(field: FormField, fieldValidation: FormFieldValidation): void;

  clearValidation(): void;

  setValidation(validation: Partial<FormValidation>): void;

  resetValidation(validation: FormValidation): void;

  protected _validateField(field: FormField, eventName?: FormValidationEventName): boolean | Promise<boolean>;

  protected _validate(
    fields?: FormField | FormField[],
    eventName?: FormValidationEventName,
  ): boolean | Promise<boolean>;

  validate(fields?: FormField | FormField[], eventName?: FormValidationEventName): boolean | Promise<boolean>;

  // region Values

  getValue(field: FormField): unknown;

  getValues<F extends FormField = FormField>(fields?: F[]): Record<F, unknown>;

  protected _setValue(field: FormField, value: unknown): void;

  setValue(field: FormField, value: unknown, options?: FormValuesSetterOptions): void;

  protected _setValues(values: FormValues): void;

  setValues(values: FormValues, options?: FormValuesSetterOptions): void;

  clearValues(options?: FormValuesSetterOptions): void;

  resetValues(values: FormValues, options?: FormValuesSetterOptions): void;

  protected onAfterValuesChange(fields: FormField | FormField[], options?: FormValuesSetterOptions): void;

  // region Events

  handleChange(field: FormField, e: unknown): void;

  handleBlur(field: FormField): void;
}

export type FormId = unknown;

export type FormFieldMessageType = 'error' | 'warning' | 'success' | 'info';

export interface FormFieldMessage {
  message?: string;
  type?: FormFieldMessageType;
}

export type FormField = string | number | symbol;

export type FormValues = Record<FormField, unknown>;

export type FormFieldsMap<D = unknown> = Map<FormField, D>;

export type FormValidationEventName = 'onChange' | 'onBlur' | 'all';

export type FormValidate<V = unknown> = (value: V, formValues?: FormValues) => boolean | Promise<boolean>;

export interface FormValidationRule<V = unknown> extends FormFieldMessage {
  validate?: FormValidate<V>;
  typeIfPassed?: FormFieldMessageType;
  needAllValues?: boolean;
  eventName?: FormValidationEventName;
}

export interface FormFieldValidation<V = unknown> {
  eventName?: FormValidationEventName;
  rules: FormValidationRule<V>[];
}

export type FormFieldRequired<V> = boolean | string | FormValidationRule<V>;

export interface FormFieldValidationParams<V = unknown> extends Partial<FormFieldValidation<V>> {
  required?: FormFieldRequired<V>;
  requiredValidate?: (value: V) => boolean | Promise<boolean>;
}

export type FormValidation = Record<FormField, FormFieldValidationParams>;

export interface FormOptions {
  validationEventName: FormValidationEventName;
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
  reset?: boolean;
  skipRerender?: boolean;
}

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

  get touched(): number;

  get changed(): number;

  get hasErrors(): boolean;

  get hasWarnings(): boolean;

  get options(): FormOptions;

  set options(opts: Partial<FormOptions>);

  clearState(): void;

  getValue(field: FormField): unknown;

  getValues<F extends FormField = FormField>(fields?: F[]): Record<F, unknown>;

  clearFieldState(field: FormField): FormFieldState;

  getFieldState(field: FormField): FormFieldState;

  getFieldData<V = unknown>(field: FormField): FormFieldData<V>;

  protected addFieldMessageInternal(fieldState: FormFieldState, message: FormFieldMessage): void;

  protected resetFieldMessagesInternal(fieldState: FormFieldState): void;

  setFieldMessages(field: FormField, messages: FormFieldMessage | FormFieldMessage[], opts?: FormStateSetterOptions): void;

  setFieldValidation(field: FormField, params: FormFieldValidationParams): void;

  setValidation(validation: FormValidation): void;

  protected validateFieldInternal(field: FormField, eventName?: FormValidationEventName): boolean | Promise<boolean>;

  protected validateInternal(fields?: FormField | FormField[], eventName?: FormValidationEventName): boolean | Promise<boolean>;

  validate(fields?: FormField | FormField[], eventName?: FormValidationEventName): boolean | Promise<boolean>;

  setValue(field: FormField, value: unknown, options?: FormValuesSetterOptions): void;

  setValues(values: FormValues, options?: FormValuesSetterOptions): void;

  clearValues(options?: FormValuesSetterOptions): void;

  resetValues(values: FormValues, options?: FormValuesSetterOptions): void;

  protected onAfterValuesChange(fields: FormField | FormField[], options?: FormValuesSetterOptions): void;

  handleChange(field: FormField, e: unknown): void;

  handleBlur(field: FormField): void;
}

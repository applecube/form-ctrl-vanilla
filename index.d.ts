export default formCtrl;

declare function formCtrl(formId: formCtrl.FormId): formCtrl.FormCtrl;

declare namespace formCtrl {
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

  export interface FormOptions {
    validationEventName: FormValidationEventName;
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

  export type FormFieldsRerenderRecord = Record<FormField, number | undefined>;

  export interface FormFieldUpdateData<V = unknown> {
    messages?: FormFieldMessage | FormFieldMessage[];
    required?: FormFieldValidationParams['required'];
    requiredValidate?: FormFieldValidationParams['requiredValidate'];
    validation?: FormFieldValidation<V>;
    value?: V;
  }

  export interface FormValuesSetterOptions {
    byUser?: boolean;
    skipRerender?: boolean;
    skipValidation?: boolean;
  }

  export interface FormStateSetterOptions {
    reset?: boolean;
    skipRerender?: boolean;
  }

  class FormCtrl {
    readonly id: FormId;
    protected readonly _options: FormOptions;
    protected readonly _state: FormState;
    protected readonly _valuesMap: FormFieldsMap;
    protected readonly _stateMap: FormFieldsMap<FormFieldState>;
    protected readonly _validationMap: FormFieldsMap<FormFieldValidation>;

    constructor(formId: FormId, options?: Partial<FormOptions>);

    destroy(): boolean;

    protected rerenderFields(fields?: FormField | FormField[]): void;

    get touched(): number;

    get changed(): number;

    get hasErrors(): boolean;

    get hasWarnings(): boolean;

    get options(): FormOptions;

    set options(opts: Partial<FormOptions>);

    getValue(field: FormField): unknown;

    getValues<F extends FormField = FormField>(fields?: F[]): Record<F, unknown>;

    resetFieldState(field: FormField): FormFieldState;

    getFieldState(field: FormField): FormFieldState;

    protected addFieldMessageInternal(fieldState: FormFieldState, message: FormFieldMessage): void;

    protected resetFieldMessagesInternal(fieldState: FormFieldState): void;

    setFieldMessages(field: FormField, messages: FormFieldMessage | FormFieldMessage[], opts?: FormStateSetterOptions): void;

    setValidation(field: FormField, params: FormFieldValidationParams): void;

    protected validateFieldInternal(field: FormField, eventName?: FormValidationEventName): boolean | Promise<boolean>;

    protected validateInternal(fields?: FormField | FormField[], eventName?: FormValidationEventName): boolean | Promise<boolean>;

    validate(fields?: FormField | FormField[], eventName?: FormValidationEventName): boolean | Promise<boolean>;

    protected setValueInternal(field: FormField, value: unknown, byUser?: boolean): void;

    setValue(field: FormField, value: unknown, opts?: FormValuesSetterOptions): void;

    setValues(values: FormValues, opts?: FormValuesSetterOptions): void;

    handleChange(field: FormField, e: any): void;

    handleBlur(field: FormField): void;
  }

  export function create(formId: FormId, options?: Partial<FormOptions>): FormCtrl;

  export function ensure(formId: FormId, options?: Partial<FormOptions>): FormCtrl;

  export function get(formId: FormId): FormCtrl | undefined;

  export function exists(formId: FormId): boolean;

  export function destroy(formId: FormId): boolean;
}

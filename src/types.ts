export type FormId = unknown;

export type FormFieldMessageType = 'error' | 'warning' | 'success' | 'info';

export interface FormFieldMessage {
  message?: string;
  type?: FormFieldMessageType;
}

type Value = any;

export type FormField = string | number | symbol;

export type FormValues = Record<FormField, Value>;

export type FormFieldsMap<D = Value> = Map<FormField, D>;

export type FormValidationEventName = 'onTouch' | 'onChange' | 'onBlur' | 'all';

export type FormFieldValidate<V = Value> = (
  value: V,
  formValues?: FormValues,
) => boolean | Promise<boolean>;

export type FormFieldRequiredValidate<V = Value> = (value: V) => boolean | Promise<boolean>;

export interface FormFieldValidationRule<V = Value> extends FormFieldMessage {
  validate?: FormFieldValidate<V>;
  typeIfPassed?: FormFieldMessageType;
  needAllValues?: boolean;
  eventName?: FormValidationEventName;
}

export type FormFieldRequired<V = Value> = boolean | string | FormFieldValidationRule<V>;

export interface FormFieldValidation<V = Value> {
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

export interface FormFieldData<V = Value> extends FormFieldState {
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

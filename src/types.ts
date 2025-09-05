export type FormId = unknown;

export type FormFieldMessageType = 'error' | 'warning' | 'success' | 'info';

export interface FormFieldMessage {
  /**
   * User readable message text.
   */
  message?: string;
  /**
   * Message type.
   */
  type?: FormFieldMessageType;
}

type Value = any;

export type FormField<FV extends object = FormValues> = keyof FV;

export type FormValues = Record<string, Value>;

export type FormValidationEventName = 'onTouch' | 'onChange' | 'onBlur' | 'all';

export type FormFieldValidate<
  FV extends object = FormValues,
  F extends FormField<FV> = FormField<FV>,
> = (value: FV[F], formValues?: FV) => boolean | Promise<boolean>;

export type FormFieldRequiredValidate<
  FV extends object = FormValues,
  F extends FormField<FV> = FormField<FV>,
> = (value: FV[F]) => boolean | Promise<boolean>;

export interface FormFieldValidationRule<
  FV extends object = FormValues,
  F extends FormField<FV> = FormField<FV>,
> extends FormFieldMessage {
  /**
   * `Rule` validate function. Can be async.
   *
   * If returns `true` or promise resolved as `true` - validation passed.
   * If it throws error or promise rejects -
   * error is silently caught and validation is considered as failed.
   *
   * If validation fails - `fieldState.messages` will have `{ message, type }`.
   * If validation succeeds - there will be no message.
   * If `typeIfPassed` provided - there will be message on validation success with this type.
   *
   * Second argument can be form values, depends on `needMoreValues` `Rule` param.
   */
  validate?: FormFieldValidate<FV, F>;
  /**
   * Message type if validation succeeds.
   * If not provided - there will be no message on validation success.
   */
  typeIfPassed?: FormFieldMessageType;
  /**
   * If provided and not `false` -
   * form values will be passed as second argument to validate function.
   *
   * If `true` - all form values will be passed.
   *
   * If fields array - only these field values will be passed.
   *
   * Should be used only when needed to avoid performance drop,
   * because form values are built from Map and validate function can be called often.
   * If only couple of values is needed - it is better to specify them.
   */
  needMoreValues?: boolean | FormField<FV>[];
  /**
   * Event name on which validate function of this rule will be triggered.
   */
  eventName?: FormValidationEventName;
}

export type FormFieldRequired<
  FV extends object = FormValues,
  F extends FormField<FV> = FormField<FV>,
> = boolean | string | FormFieldValidationRule<FV, F>;

export interface FormFieldValidation<
  FV extends object = FormValues,
  F extends FormField<FV> = FormField<FV>,
> {
  /**
   * Event on which validation rules including required will trigger.
   * Applies to all rules if there is no override in a rule.
   */
  eventName?: FormValidationEventName;
  /**
   * Array of validation settings.
   * Each item is for specific message with its type and validate function.
   */
  rules?: FormFieldValidationRule<FV, F>[];
  /**
   * Required rule is made separate as its most used one and often provided as boolean.
   *
   * If `true` - default `requiredMessage` and `requiredValidate` with `type='error'` will be used.
   *
   * If `string` - same as `true` but with `requiredMessage` as this string.
   *
   * `Rule` object can be passed to override more things.
   * If some settings are missing - for example validate function - default `requiredValidate` will be used.
   */
  required?: FormFieldRequired<FV, F>;
  /**
   * Overrides default required validate function.
   */
  requiredValidate?: FormFieldRequiredValidate<FV, F>;
}

export type FormValidation<FV extends object = FormValues> = {
  [F in FormField<FV>]?: FormFieldValidation<FV, F>;
};

export type OnChangeOptions<O> = Omit<O, keyof FormValuesSetterOptions>;

export interface FormOptions<
  FV extends object = FormValues,
  O extends FormValuesSetterOptions = FormValuesSetterOptions,
> {
  validationEventName?: FormValidationEventName;
  requiredValidate?: FormFieldRequiredValidate<FV>;
  requiredMessage?: string;
  defaultValues?: FV;
  onValueChange?: <F extends FormField<FV> = FormField<FV>>(
    field: F,
    value: FV[F],
    prevValue: FV[F],
    onChangeOptions?: OnChangeOptions<O>,
  ) => void;
  onMessagesChange?: (
    field: FormField<FV>,
    messages: FormFieldMessage[] | null,
    prevMessages: FormFieldMessage[] | null,
    onChangeOptions?: OnChangeOptions<O>,
  ) => void;
  onErrorChange?: (
    field: FormField<FV>,
    error: boolean,
    prevError: boolean,
    onChangeOptions?: OnChangeOptions<O>,
  ) => void;
  onWarningChange?: (
    field: FormField<FV>,
    warning: boolean,
    prevWarning: boolean,
    onChangeOptions?: OnChangeOptions<O>,
  ) => void;
}

export interface FormConstructorOptions<
  FV extends object = FormValues,
  O extends FormValuesSetterOptions = FormValuesSetterOptions,
> extends Partial<FormOptions<FV, O>> {
  validation?: FormValidation<FV>;
  values?: FV;
  register?: Partial<Record<FormField<FV>, HTMLElement | HTMLElement[]>>;
}

export interface FormFieldState {
  /**
   * Counter of values changes by user.
   */
  touched: number;
  /**
   * Counter of values changes by any means.
   */
  changed: number;
  /**
   * Counter of fields blurred with handleBlur.
   */
  blurred: number;
  /**
   * `true` if there is at least one message with `type === 'error'`,
   * or if `forceFieldError` has been used.
   */
  error: boolean;
  /**
   * `true` if there is at least one message with `type === 'warning'`,
   * or if `forceFieldWarning` has been used.
   */
  warning: boolean;
  /**
   * All field messages (custom and validation: required, rules).
   *
   * Immutable array - there will be new array each time messages change.
   *
   * Messages preserve order
   *
   * 1. required message
   *
   * 2. rules messages in same order as rules array
   *
   * 3. custom messages in added order
   */
  messages: FormFieldMessage[] | null;
}

export interface FormFieldInternalState {
  requiredMessage: FormFieldMessage | null;
  rulesMessages: (FormFieldMessage | undefined)[] | null;
  customMessages: FormFieldMessage[] | null;
  errorOverride: boolean | null;
  warningOverride: boolean | null;
}

export interface FormValuesSetterOptions {
  byUser?: boolean;
  skipChangeUpdate?: boolean;
  skipValidation?: boolean;
}

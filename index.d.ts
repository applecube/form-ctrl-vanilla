import type { FormId, FormConstructorOptions, FormCtrl } from './src/FormCtrl';

export declare function formCtrl(formId: FormId): FormCtrl;

export declare namespace formCtrl {
  export const create: (formId: FormId, options?: FormConstructorOptions) => FormCtrl;

  export const ensure: (formId: FormId, options?: FormConstructorOptions) => FormCtrl;

  export const get: (formId: FormId) => FormCtrl | undefined;

  export const exists: (formId: FormId) => boolean;

  export const destroy: (formId: FormId) => boolean;

  export const keys: () => FormId[];
}

export * from './src/FormCtrl';

export default formCtrl;

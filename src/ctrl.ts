import { FormCtrl } from './class.js';
import type { FormId, FormConstructorOptions } from './types.js';

interface FormCtrlFunction {
  (formId: FormId): FormCtrl;

  create: (formId: FormId, options?: FormConstructorOptions) => FormCtrl;

  get: (formId: FormId) => FormCtrl | undefined;

  keys: () => FormId[];
}

export const formCtrl: FormCtrlFunction = (formId) => {
  return FormCtrl.get<FormCtrl>(formId) || new FormCtrl(formId);
};

formCtrl.create = (formId, options) => new FormCtrl(formId, options);

formCtrl.get = (formId) => FormCtrl.get<FormCtrl>(formId);

formCtrl.keys = () => FormCtrl.keys();

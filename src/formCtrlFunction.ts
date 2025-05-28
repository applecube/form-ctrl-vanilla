import { FormCtrl } from './FormCtrl.js';
import type { FormId, FormConstructorOptions } from './types.js';

interface FormCtrlFunction {
  (formId: FormId): FormCtrl;

  create: (formId: FormId, options?: FormConstructorOptions) => FormCtrl;

  ensure: (formId: FormId, options?: FormConstructorOptions) => FormCtrl;

  get: (formId: FormId) => FormCtrl | undefined;

  exists: (formId: FormId) => boolean;

  destroy: (formId: FormId) => boolean;

  keys: () => FormId[];
}

export const formCtrl: FormCtrlFunction = (formId) => {
  return FormCtrl.get<FormCtrl>(formId) || new FormCtrl(formId);
};

formCtrl.create = (formId, options) => new FormCtrl(formId, options);

formCtrl.ensure = (formId, options) =>
  FormCtrl.get<FormCtrl>(formId) || new FormCtrl(formId, options);

formCtrl.get = (formId) => FormCtrl.get<FormCtrl>(formId);

formCtrl.exists = (formId) => Boolean(FormCtrl.get<FormCtrl>(formId));

formCtrl.destroy = (formId) => FormCtrl.get<FormCtrl>(formId)?.destroy() || false;

formCtrl.keys = () => FormCtrl.keys();

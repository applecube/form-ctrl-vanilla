import { FormCtrl } from './class.js';
import type { FormId, FormConstructorOptions, FormValues } from './types.js';

interface FormCtrlFunction {
  <FV extends object = FormValues>(formId: FormId): FormCtrl<FV>;

  create: <FV extends object = FormValues>(
    formId: FormId,
    options?: FormConstructorOptions<FV>,
  ) => FormCtrl<FV>;

  get: <FV extends object = FormValues>(formId: FormId) => FormCtrl<FV> | undefined;

  keys: () => FormId[];

  destroyAll: () => void;
}

export const formCtrl: FormCtrlFunction = (formId) => {
  return FormCtrl.get(formId) || new FormCtrl(formId);
};

formCtrl.create = (formId, options) => new FormCtrl(formId, options);

formCtrl.get = (formId: FormId) => FormCtrl.get(formId);

formCtrl.keys = () => FormCtrl.keys();

formCtrl.destroyAll = () => FormCtrl.destroyAll();

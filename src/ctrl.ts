import { FormCtrl } from './class.js';
import type { FormId, FormConstructorOptions } from './types.js';

export interface FormCtrlFunction<
  C extends typeof FormCtrl = typeof FormCtrl,
  O extends FormConstructorOptions = FormConstructorOptions,
> {
  (formId: FormId): InstanceType<C>;

  FormCtrl: C;

  create: (formId: FormId, options?: O) => InstanceType<C>;

  get: (formId: FormId) => InstanceType<C> | undefined;

  keys: () => FormId[];
}

export const formCtrl: FormCtrlFunction = (formId) => {
  return formCtrl.FormCtrl.get<FormCtrl>(formId) || new formCtrl.FormCtrl(formId);
};

formCtrl.FormCtrl = FormCtrl;

formCtrl.create = (formId, options) => new formCtrl.FormCtrl(formId, options);

formCtrl.get = (formId) => formCtrl.FormCtrl.get<FormCtrl>(formId);

formCtrl.keys = () => formCtrl.FormCtrl.keys();

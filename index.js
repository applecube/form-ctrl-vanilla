import { FormCtrl } from './src/FormCtrl';

export function formCtrl(formId) {
  return FormCtrl.get(formId) || new FormCtrl(formId);
}

formCtrl.create = (formId, options) => new FormCtrl(formId, options);

formCtrl.ensure = (formId, options) => FormCtrl.get(formId) || new FormCtrl(formId, options);

formCtrl.get = (formId) => FormCtrl.get(formId);

formCtrl.exists = (formId) => Boolean(FormCtrl.get(formId));

formCtrl.destroy = (formId) => FormCtrl.get(formId)?.destroy() || false;

export default formCtrl;

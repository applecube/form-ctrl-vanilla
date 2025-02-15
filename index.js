import { FormCtrl, formCtrlHolder } from './src/FormCtrl';

const formCtrl = (formId) => formCtrlHolder.get(formId) || new FormCtrl(formId);

formCtrl.FormCtrl = FormCtrl;

formCtrl.formCtrl = formCtrl;

formCtrl.create = (formId, options) => new FormCtrl(formId, options);

formCtrl.ensure = (formId, options) => formCtrlHolder.get(formId) || new FormCtrl(formId, options);

formCtrl.get = (formId) => formCtrlHolder.get(formId);

formCtrl.exists = (formId) => Boolean(formCtrlHolder.get(formId));

formCtrl.destroy = (formId) => formCtrlHolder.get(formId)?.destroy() || false;

export default formCtrl;

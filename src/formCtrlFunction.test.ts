import { formCtrl } from './formCtrlFunction.js';

test('formCtrl', () => {
  expect(formCtrl.get('id1')).toBe(undefined);

  expect(formCtrl.create('id1').id).toBe('id1');

  expect(formCtrl('id1')).not.toBe(undefined);

  expect(formCtrl.ensure('id2').id).toBe('id2');

  expect(formCtrl.keys()).toStrictEqual(['id1', 'id2']);

  expect(formCtrl.destroy('id3')).toBe(false);

  expect(formCtrl.destroy('id2')).toBe(true);

  expect(formCtrl.keys()).toStrictEqual(['id1']);

  expect(formCtrl.get('id2')).toBe(undefined);

  expect(formCtrl.exists('id1')).toBe(true);

  expect(formCtrl('id2')).not.toBe(undefined);
});

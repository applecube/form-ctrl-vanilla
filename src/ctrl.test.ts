import { formCtrl } from './ctrl.js';

test('formCtrl', () => {
  expect(formCtrl.get('id1')).toBe(undefined);

  expect(formCtrl.create('id1').id).toBe('id1');

  expect(formCtrl('id1')).not.toBe(undefined);

  expect(formCtrl.keys()).toStrictEqual(['id1']);

  expect(formCtrl.get('id2')).toBe(undefined);

  expect(formCtrl('id2')).not.toBe(undefined);

  expect(formCtrl.keys()).toStrictEqual(['id1', 'id2']);
});

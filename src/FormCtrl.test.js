import { FormCtrl } from './FormCtrl';

describe('FormCtrl', () => {
  test('creation', () => {
    const form = new FormCtrl('form_1');
    expect(FormCtrl.get('form_1')).toBe(form);
  });
});

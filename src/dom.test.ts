import {
  getElementValue,
  getElementsValue,
  getSameElementType,
  setElementValue,
  setElementsValue,
} from './dom.js';

type ElementTag = 'input' | 'textarea' | 'select';

type ElementType =
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'text'
  | 'number'
  | 'file'
  | 'password'
  | 'multiple';

/**
 * Default value of createElement(s)
 */
const elv = (i?: number) => {
  let value = 'test';
  if (i !== undefined) value += i;
  return value;
};

interface TagToElement {
  input: HTMLInputElement;
  select: HTMLSelectElement;
  textarea: HTMLTextAreaElement;
}

const createElement = <T extends ElementTag = ElementTag>(
  tagName: T,
  type?: ElementType,
  value: string = elv(),
  name?: string,
): TagToElement[T] => {
  const el = document.createElement(tagName);
  if (el.tagName === 'INPUT' && type) (el as HTMLInputElement).type = type;
  if (el.tagName === 'SELECT') {
    if (type === 'multiple') (el as HTMLSelectElement).multiple = true;
    for (let i = 0; i < 5; i++) {
      const opt = document.createElement('option');
      opt.value = elv(i);
      opt.selected = type === 'multiple' ? i % 2 === 1 : i === 1;
      el.appendChild(opt);
    }
  } else if (el.type !== 'file') el.value = value;
  if (name) el.name = name;
  document.body.appendChild(el);
  return el;
};

const createElements = <T extends ElementTag = ElementTag>(
  count: number,
  tagName: T,
  type?: ElementType,
): TagToElement[T][] => {
  if (count < 1) return [];
  return Array.from(Array(count), (_, i) =>
    createElement(tagName, type, elv(i), type === 'radio' ? 'radio' : undefined),
  );
};

describe('getSameElementType', () => {
  test('same type', () => {
    expect(getSameElementType(createElements(4, 'input', 'radio'))).toBe('radio');
    expect(getSameElementType(createElements(4, 'input', 'checkbox'))).toBe('checkbox');
    expect(getSameElementType(createElements(4, 'input', 'text'))).toBe('text');
  });

  test('mixed type', () => {
    const mixed1 = [createElement('input'), createElement('input', 'checkbox')];
    const mixed2 = [
      createElement('input'),
      createElement('textarea'),
      createElement('input', 'number'),
    ];
    const mixed3 = [
      createElement('textarea'),
      ...createElements(5, 'input', 'password'),
      createElement('select'),
    ];
    const mixed4 = [
      createElement('select'),
      createElement('input', 'file'),
      createElement('textarea'),
    ];

    expect(getSameElementType(mixed1)).toBe(false);
    expect(getSameElementType(mixed2)).toBe(false);
    expect(getSameElementType(mixed3)).toBe(false);
    expect(getSameElementType(mixed4)).toBe(false);
  });
});

describe('getElementValue', () => {
  test('input text', () => {
    const itext = createElement('input');
    expect(getElementValue(itext)).toBe(elv());
  });

  test('input checkbox', () => {
    const ch = createElement('input', 'checkbox');
    expect(getElementValue(ch)).toBe(false);
    ch.checked = true;
    expect(getElementValue(ch)).toBe(true);
  });

  test('input radio', () => {
    const radio = createElement('input', 'radio');
    expect(getElementValue(radio)).toBe(undefined);
    radio.checked = true;
    expect(getElementValue(radio)).toBe(elv());
  });

  test('textarea', () => {
    const ta = createElement('textarea');
    expect(getElementValue(ta)).toBe(elv());
  });

  test('select single', () => {
    const sel = createElement('select');
    expect(getElementValue(sel)).toBe(elv(1));
  });

  test('select multiple', () => {
    const selm = createElement('select', 'multiple');
    expect(getElementValue(selm)).toStrictEqual([elv(1), elv(3)]);
  });
});

// todo more
describe('getElementsValue', () => {
  test('all radios', () => {
    const radios = createElements(4, 'input', 'radio');
    if (radios[1]) radios[1].checked = true;
    expect(getElementsValue(radios)).toBe(elv(1));
  });

  test('all checkboxes', () => {
    const chs = createElements(4, 'input', 'checkbox');
    if (chs[1]) chs[1].checked = true;
    if (chs[3]) chs[3].checked = true;
    expect(getElementsValue(chs)).toStrictEqual([elv(1), elv(3)]);
  });

  test('all input texts', () => {
    const itexts = createElements(4, 'input', 'text');
    expect(getElementsValue(itexts)).toStrictEqual([elv(0), elv(1), elv(2), elv(3)]);
  });
});

// todo more
describe('setElementValue', () => {
  test('input text', () => {
    const itext = createElement('input');
    setElementValue(itext, 'asd');
    expect(itext.value).toBe('asd');
  });

  test('input checkbox', () => {
    const ch = createElement('input', 'checkbox');
    expect(ch.checked).toBe(false);
    setElementValue(ch, true);
    expect(ch.checked).toBe(true);
    ch.checked = false;
    setElementValue(ch, 'sdf');
    expect(ch.checked).toBe(true);
  });
});

// todo more
describe('setElementsValue', () => {
  test('all radios, single value', () => {
    const radios = createElements(3, 'input', 'radio');
    expect(radios.map((r) => r.checked)).toStrictEqual([false, false, false]);
    setElementsValue(radios, elv(2));
    expect(radios.map((r) => r.checked)).toStrictEqual([false, false, true]);
    setElementsValue(radios, elv(1));
    expect(radios.map((r) => r.checked)).toStrictEqual([false, true, false]);
    setElementsValue(radios, elv(0));
    expect(radios.map((r) => r.checked)).toStrictEqual([true, false, false]);
  });
});

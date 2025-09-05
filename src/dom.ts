const SELECT_TAG = 'SELECT';
const CHECKBOX_TYPE = 'checkbox';
const RADIO_TYPE = 'radio';

/**
 * Returns html element `type` if
 * - `elements` array is not empty
 * - `type` is the same for all `elements`
 *
 * Otherwise returns `false`
 */
export const getSameElementType = (elements: HTMLElement[]) => {
  const len = elements.length;
  if (!len) return false;
  const type = (elements[0] as HTMLInputElement).type;
  for (let i = 1; i < len; i++) {
    if ((elements[i] as HTMLInputElement).type !== type) return false;
  }
  return type;
};

/**
 * Gets value of form control html element depending on its tag and type.
 */
export const getElementValue = (element: HTMLElement) => {
  const el = element as any;

  if (el.type === CHECKBOX_TYPE) return el.checked;

  if (el.type === RADIO_TYPE) return el.checked ? el.value : undefined;

  if (el.tagName === SELECT_TAG && el.multiple) {
    const values = [];
    for (const o of el.selectedOptions) {
      values.push(o.value);
    }
    return values;
  }

  return el.value;
};

/**
 * Gets value or values of form control html elements
 * depending on its tags, types.
 *
 * Special treatment if all are radios or checkboxes.
 */
export const getElementsValue = (elements: HTMLElement[]) => {
  const sameType = getSameElementType(elements);

  if (sameType === RADIO_TYPE) {
    for (const radio of elements as HTMLInputElement[]) {
      if (radio.checked) return radio.value;
    }
    return;
  }

  if (sameType === CHECKBOX_TYPE) {
    const checkedValues = [];
    for (const ch of elements as HTMLInputElement[]) {
      if (ch.checked) checkedValues.push(ch.value);
    }
    return checkedValues;
  }

  return elements.map(getElementValue);
};

/**
 * Sets value to form control html element depending on its tag and type.
 */
export const setElementValue = (element: HTMLElement, value: any) => {
  const el = element as any;

  if (el.type === CHECKBOX_TYPE) {
    el.checked = Boolean(value);
    return;
  }

  if (el.type === RADIO_TYPE) {
    el.checked = el.value === value;
    return;
  }

  if (el.tagName === SELECT_TAG && el.multiple && Array.isArray(value)) {
    for (const opt of el.options) {
      opt.selected = value.includes(opt.value);
    }
    return;
  }

  el.value = value ?? '';
};

/**
 * Sets value or values to form control html elements
 * depending on its tags, types and if array of values provided.
 *
 * Special treatment if all are radios or checkboxes.
 */
export const setElementsValue = (elements: HTMLElement[], value: any) => {
  const sameType = getSameElementType(elements);

  // array value

  if (Array.isArray(value)) {
    // all checkboxes - check if checkbox.value is in array
    if (sameType === CHECKBOX_TYPE) {
      for (const el of elements as HTMLInputElement[]) {
        el.checked = value.includes(el.value);
      }
      return;
    }

    // set each value to corresponding element
    const len = elements.length;
    for (let i = 0; i < len; i++) {
      setElementValue(elements[i] as HTMLElement, value[i]);
    }
    return;
  }

  // single value

  // if all checkboxes - check one with same value
  if (sameType === CHECKBOX_TYPE) {
    for (const el of elements as HTMLInputElement[]) {
      el.checked = el.value === value;
    }
    return;
  }

  // if all radio - check one with the same value
  if (sameType === RADIO_TYPE) {
    for (const el of elements as HTMLInputElement[]) {
      el.checked = el.value === value;
    }
    return;
  }

  // otherwise set same value to each element
  for (const el of elements) {
    setElementValue(el, value);
  }
};

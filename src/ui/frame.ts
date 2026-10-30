/**
 * Per-frame DOM helpers (ticket 033 B). `update()` runs every animation frame, so each helper writes only when the
 * value differs from what the node already shows. A frame that changes nothing makes no DOM write, and a write that
 * would dirty the style is not repeated. Each helper takes the smallest structural type it needs, so the tests run
 * them on stub objects with no DOM.
 */

import type { CapacityRow, TargetRow } from "./logic";

/** The attribute members the guard reads and writes. Every Element has them. */
export interface AttrNode {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
}

/** The class members the guard reads and writes. Every Element has them. */
export interface ClassNode {
  classList: { contains(name: string): boolean; toggle(name: string, force?: boolean): boolean };
}

/** Writes `textContent` only when it changed. */
export function setText(node: { textContent: string | null }, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

/** Writes the attribute only when its value changed. A missing attribute counts as changed. */
export function setAttr(node: AttrNode, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/** Toggles the class only when its presence differs from `on`. */
export function setClass(node: ClassNode, name: string, on: boolean): void {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}

/** Assigns a property (`hidden`, `title`, `value`, a style longhand) only when it differs. */
export function setProp<T extends object, K extends keyof T>(node: T, key: K, value: T[K]): void {
  if (node[key] !== value) node[key] = value;
}

/**
 * One list of fields as a string. Each field carries its own length, so two different field lists never share a key
 * (a label with a `:` or a `|` in it cannot pass for two fields). A field's text is its String() form.
 */
export function fieldKey(fields: readonly (string | number | boolean)[]): string {
  let key = "";
  for (const field of fields) {
    const text = String(field);
    key += `${text.length}:${text}`;
  }
  return key;
}

/**
 * The change key for the capacity readout: a function of the fields it draws (text, and the alarm that adds the
 * brownout class). Equal rows give equal keys. Each row is self-delimiting (fixed field count), so the rows join
 * with nothing between them.
 */
export function capacityRowsKey(rows: readonly CapacityRow[]): string {
  let key = "";
  for (const row of rows) key += fieldKey([row.text, row.alarm]);
  return key;
}

/**
 * The change key for the priests' list: a function of the fields it draws (lamp id, lit, text). Equal rows give
 * equal keys. The row count is implied, since each row is self-delimiting.
 */
export function targetRowsKey(rows: readonly TargetRow[]): string {
  let key = "";
  for (const row of rows) key += fieldKey([row.id, row.lit, row.text]);
  return key;
}

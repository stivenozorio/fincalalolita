import { createRequire } from "node:module";
import assert from "node:assert/strict";
const O = createRequire(import.meta.url)("../js/order-core.js");

const cat = { products: [
  { id: "a", confirmed: true, available: true, presentations: [{ id: "x", label: { es: "Cubeta 30" }, price: 15000 }, { id: "y", label: { es: "Docena" }, price: null }], name: { es: "Huevos A" } },
  { id: "b", confirmed: true, available: false, presentations: [{ id: "x", price: 100 }], name: { es: "B" } },
  { id: "c", confirmed: false, provisional: true, available: false, presentations: [{ id: "x", price: null }], name: { es: "C" } }
]};

// visibilidad
assert.deepEqual(O.visibleProducts(cat, false).map(p => p.id), ["a", "b"]);
assert.deepEqual(O.visibleProducts(cat, true).map(p => p.id), ["a", "b", "c"]);
// no se puede pedir: no disponible, o provisional en producción
assert.equal(O.isOrderable(cat.products[1], false), false);
assert.equal(O.isOrderable(cat.products[2], false), false);
assert.equal(O.isOrderable(cat.products[2], true), true);
// líneas y cantidades
const lines = O.buildLines(cat, { "a::x": 2, "b::x": 5, "a::y": "abc", "a::z": 1 }, "es", false);
assert.equal(lines.length, 1);
assert.equal(O.clampQty(-3), 0); assert.equal(O.clampQty(1e9), 99); assert.equal(O.clampQty("3.9"), 3);
// total solo con precios confirmados
assert.equal(O.total(lines), 30000);
const mixed = O.buildLines(cat, { "a::x": 1, "a::y": 1 }, "es", false);
assert.equal(O.total(mixed), null);
assert.ok(!O.buildMessage(mixed, "", "L").includes("Total"));
assert.ok(O.buildMessage(lines, "sin   bolsa", "L").includes("Total: $30.000 COP"));
assert.ok(O.buildMessage(lines, "sin   bolsa", "L").includes("Observaciones: sin bolsa"));
// número y URL
assert.equal(O.normalizeNumber(""), null);
assert.equal(O.normalizeNumber("123"), null);
assert.equal(O.buildWhatsAppUrl("", lines, "", "L"), null);
assert.equal(O.buildWhatsAppUrl("573001112233", [], "", "L"), null);
assert.match(O.buildWhatsAppUrl("+57 300 111 2233", lines, "", "L"), /^https:\/\/wa\.me\/573001112233\?text=/);
console.log("order-core: OK");

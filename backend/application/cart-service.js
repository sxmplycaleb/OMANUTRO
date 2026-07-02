const carts = require("../repositories/carts");

function listCart(user) {
  return carts.allForUser(user.id);
}

function replaceCart(user, items) {
  return carts.replaceForUser(user.id, items);
}

function mergeCart(user, items) {
  return carts.mergeForUser(user.id, items);
}

function updateCartItem(user, itemId, quantity) {
  return carts.updateItem(user.id, itemId, quantity);
}

function removeCartItem(user, itemId) {
  return carts.removeItem(user.id, itemId);
}

module.exports = {
  listCart,
  replaceCart,
  mergeCart,
  updateCartItem,
  removeCartItem
};

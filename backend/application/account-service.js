const users = require("../repositories/users");
const orders = require("../repositories/orders");
const carts = require("../repositories/carts");
const addresses = require("../repositories/addresses");
const wishlist = require("../repositories/wishlist");
const savedJobs = require("../repositories/saved-jobs");
const { publicUser } = require("../services/store");
const { normalizePhone } = require("../services/whatsapp");
const { deleteUploadThingFile, uploadChanged } = require("../lib/uploadthing/files");

function orderStats(userOrders) {
  return {
    total: userOrders.length,
    pending: userOrders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length,
    completed: userOrders.filter((order) => ["Delivered", "Processing"].includes(order.status) || order.paymentStatus === "Paid").length
  };
}

function dashboard(user) {
  const userOrders = orders.forUser(user.id);
  const cart = carts.allForUser(user.id);
  const userWishlist = wishlist.allForUser(user.id);
  const userSavedJobs = savedJobs.allForUser(user.id);

  return {
    user: publicUser(user),
    stats: {
      orders: orderStats(userOrders),
      cartItems: cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      wishlist: userWishlist.length
    },
    orders: userOrders,
    cart,
    wishlist: userWishlist,
    savedJobs: userSavedJobs,
    addresses: addresses.allForUser(user.id)
  };
}

async function updateProfile(user, body) {
  const name = String(body.name || user.name || "").trim();
  const phone = body.phone || user.phone;
  const updated = users.updateProfile(user.id, {
    name,
    phone,
    phoneNormalized: normalizePhone(phone) || null,
    dob: body.dob || user.dob || "",
    gender: body.gender || user.gender || "",
    username: body.username || user.username || "",
    bio: body.bio || user.bio || ""
  });

  if ((body.avatarUrl !== undefined || body.avatarKey !== undefined) && users.updateAvatar) {
    if (uploadChanged(user.avatarKey, body.avatarKey)) {
      await deleteUploadThingFile(user.avatarKey);
    }
    return publicUser(users.updateAvatar(updated.id, body.avatarUrl, body.avatarKey));
  }

  return publicUser(updated);
}

module.exports = {
  dashboard,
  updateProfile
};

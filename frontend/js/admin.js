(function () {
  const ORDER_STATUSES = ["Processing", "Packed", "Shipped", "Delivered", "Cancelled"];

  function canShowAdmin(user) {
    return user?.role === "admin";
  }

  window.CommerceAdmin = {
    ORDER_STATUSES,
    canShowAdmin
  };
})();

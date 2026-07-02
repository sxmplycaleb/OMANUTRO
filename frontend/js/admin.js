(function () {
  const ORDER_STATUSES = ["Processing", "Packed", "Shipped", "Delivered", "Cancelled"];

  function canShowAdmin(user) {
    const permissions = user?.permissions || [];
    return user?.role === "admin" || user?.role === "super_admin" || permissions.includes("*") || permissions.includes("admin:access");
  }

  window.CommerceAdmin = {
    ORDER_STATUSES,
    canShowAdmin
  };
})();

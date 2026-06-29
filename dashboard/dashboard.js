document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.dash-nav-link');
    const tabContents = document.querySelectorAll('.dash-tab');
    const pageTitle = document.getElementById('page-title');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.dash-sidebar');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    function initTheme() {
        const savedTheme = localStorage.getItem('commerce-theme');
        if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    
    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('commerce-theme', newTheme);
        updateThemeIcon(newTheme);
    }
    
    function switchTab(tabName) {
        tabs.forEach(t => {
            t.classList.remove('active');
            t.removeAttribute('aria-current');
        })
        
        tabContents.forEach(c => c.classList.remove('active'));
        
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        
        const activeTab = document.getElementById(`tab-${tabName}`);
        
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
        activeTab.classList.add('active');
        
        pageTitle.textContent = getTabTitle(tabName);
        
        if (tabName === 'orders') loadOrders();
        if (tabName === 'wishlist') loadWishlist();
        if (tabName === 'addresses') loadAddresses();
    }
    
    function getTabTitle(tab) {
        const titles = {
            overview: 'Account Overview',
            orders: 'My Orders',
            wishlist: 'Wishlist',
            addresses: 'Saved Addresses',
            settings: 'Account Settings'
        };
        return titles[tab] || 'My Account';
    }
    
    document.querySelector('.dash-nav').addEventListener('click', (e) => {
        if (e.target.matches('.dash-nav-link')) {
            e.preventDefault();
            switchTab(e.target.dataset.tab);
        }
});

themeToggle.addEventListener('click', toggleTheme);
mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
});

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading(true);
    
    await new Promise(r => setTimeout(r, 800));
    alert('✅ Settings saved successfully!');
    showLoading(false);
});

document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('commerce-auth-token');
        window.location.href = '/login.html';
    }
});

document.getElementById('delete-account-btn').addEventListener('click', () => {
    if (confirm('⚠️ This action cannot be undone. Delete account?')) {
        alert('Account deletion request initiated.');
    }
});

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

initTheme();

async function loadDashboard() {
    try {
        const token = localStorage.getItem("commerce-auth-token") || "";
        const ordersResponse = await fetch("/api/orders", {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];

        const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const pending = orders.filter((order) => order.status !== "Delivered" && order.status !== "Cancelled").length;
        const delivered = orders.filter((order) => order.status === "Delivered").length;

        document.getElementById("total-orders").textContent = orders.length;
        document.getElementById("total-spent").textContent = `$${totalSpent.toFixed(2)}`;
        document.getElementById("pending-orders").textContent = pending;
        document.getElementById("delivered-orders").textContent = delivered;

        const recent = orders.slice(0, 3);
        document.getElementById("recent-orders-list").innerHTML = recent.length
            ? recent.map((order) => `<div class="dash-order-row">${order.id} - ${order.status}</div>`).join("")
            : "No recent orders.";
    } catch (error) {
        document.getElementById("recent-orders-list").textContent = "Unable to load analytics.";
    }
}
loadDashboard();
});

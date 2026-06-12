export const Auth = {
    currentUser: null,

    init() {
        const storedUser = localStorage.getItem('budgetTrackerUser');
        if (!storedUser) {
            window.location.href = 'login.html';
            return false;
        }

        this.currentUser = JSON.parse(storedUser);
        this.updateUserUI();
        return true;
    },

    updateUserUI() {
        const userAvatar = document.getElementById('userAvatar');
        const userInfoText = document.getElementById('userInfoText');

        if (userAvatar && this.currentUser) {
            if (this.currentUser.photo) {
                userAvatar.innerHTML = `<img src="${this.currentUser.photo}" alt="${this.currentUser.name || 'User'}">`;
            } else {
                const initial = (this.currentUser.name || this.currentUser.email || 'U').charAt(0).toUpperCase();
                userAvatar.innerHTML = initial;
            }
        }

        if (userInfoText && this.currentUser) {
            userInfoText.innerHTML = `
                <div class="user-name">${this.escapeHtml(this.currentUser.name || 'User')}</div>
                <div class="user-email">${this.escapeHtml(this.currentUser.email || '')}</div>
            `;
        }

        window.USER_DATA_KEY = `budgetTrackerData_${this.currentUser.uid}`;
    },

    logout() {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('budgetTrackerUser');
            window.location.href = 'login.html';
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
};

import { Auth } from './auth.js';
import { loadBudgetData, saveBudgetData } from './storage.js';

export const app = {
    data: {
        budget: 0,
        savingsGoal: 0,
        categories: [],
        spendings: [],
        fixedSpendings: []
    },

    init() {
        if (!Auth.init()) return;

        this.loadData();
        this.initializeDefaults();
        this.setupEventListeners();

        const shouldShowSetup = this.shouldForceSetupPage();
        if (shouldShowSetup) {
            this.resetMonthlyData();
            this.showSetupModal();
            alert('New month detected. Please set your monthly budget and savings goal before using the tracker.');
        } else {
            this.hideSetupModal();
            this.switchPage('summary');
        }

        this.setSpendingMode('daily');
        this.updateUI();
        this.renderCategories();
        this.renderFilterCategories();
        this.renderFixedSpendings();
    },

    initializeDefaults() {
        this.data.categories = Array.isArray(this.data.categories) ? this.data.categories : [];
        this.data.spendings = Array.isArray(this.data.spendings) ? this.data.spendings : [];
        this.data.fixedSpendings = Array.isArray(this.data.fixedSpendings) ? this.data.fixedSpendings : [];

        if (this.data.categories.length === 0) {
            this.data.categories = [
                { name: 'Food', limit: null },
                { name: 'Transport', limit: null },
                { name: 'Clothing', limit: null }
            ];
        }

        const spendingDate = document.getElementById('spendingDate');
        if (spendingDate) spendingDate.valueAsDate = new Date();
    },

    shouldForceSetupPage() {
        const currentMonthKey = this.getCurrentMonthKey();
        const storedMonthKey = localStorage.getItem('budgetTrackerMonth');
        return !storedMonthKey || storedMonthKey !== currentMonthKey;
    },

    resetMonthlyData() {
        this.data.budget = 0;
        this.data.savingsGoal = 0;
        this.data.spendings = [];
        localStorage.setItem('budgetTrackerMonth', this.getCurrentMonthKey());
        this.saveData();
    },

    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    setupEventListeners() {
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchPage(e.target.dataset.page));
        });

        document.getElementById('saveSetupBtn')?.addEventListener('click', () => this.saveSetup());
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.addCategory());
        document.getElementById('updateBudgetBtn')?.addEventListener('click', () => this.saveBudgetSettings());

        document.getElementById('addLimitCategoryBtn')?.addEventListener('click', () => this.addLimitCategory());
        document.getElementById('saveLimitsBtn')?.addEventListener('click', () => this.saveLimits());

        document.getElementById('addSpendingBtn')?.addEventListener('click', () => this.addSpending());
        document.getElementById('dailyModeBtn')?.addEventListener('click', () => this.setSpendingMode('daily'));
        document.getElementById('fixedModeBtn')?.addEventListener('click', () => this.setSpendingMode('fixed'));
        document.getElementById('spendingPeriod')?.addEventListener('change', () => this.toggleCustomPeriod());
        document.getElementById('fixedEditPeriod')?.addEventListener('change', () => this.toggleFixedEditCustomPeriod());
        document.getElementById('saveFixedEditBtn')?.addEventListener('click', () => this.saveFixedSpendingEdit());
        document.getElementById('cancelFixedEditBtn')?.addEventListener('click', () => this.hideFixedEditModal());

        document.getElementById('filterCategory')?.addEventListener('change', () => this.filterHistory());
        document.getElementById('filterType')?.addEventListener('change', () => this.filterHistory());
        document.getElementById('resetFiltersBtn')?.addEventListener('click', () => this.resetFilters());

        document.getElementById('newCategoryName')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });
    },

    switchPage(pageName) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(pageName)?.classList.add('active');
        document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

        if (pageName === 'history') this.renderHistory();
        else if (pageName === 'summary') this.renderSummary();
        else if (pageName === 'limits') {
            this.renderLimitsPage();
            this.renderLimitsBreakdown();
        }
    },

    setSpendingMode(mode) {
        const dateGroup = document.getElementById('dateGroup');
        const periodGroup = document.getElementById('periodGroup');
        const customPeriodGroup = document.getElementById('customPeriodGroup');
        const dailyBtn = document.getElementById('dailyModeBtn');
        const fixedBtn = document.getElementById('fixedModeBtn');

        this.currentSpendingMode = mode;

        if (mode === 'fixed') {
            dateGroup?.classList.add('hidden');
            periodGroup?.classList.remove('hidden');
            dailyBtn?.classList.remove('btn-primary');
            dailyBtn?.classList.add('btn-secondary');
            fixedBtn?.classList.remove('btn-secondary');
            fixedBtn?.classList.add('btn-primary');
        } else {
            dateGroup?.classList.remove('hidden');
            periodGroup?.classList.add('hidden');
            customPeriodGroup?.classList.add('hidden');
            dailyBtn?.classList.remove('btn-secondary');
            dailyBtn?.classList.add('btn-primary');
            fixedBtn?.classList.remove('btn-primary');
            fixedBtn?.classList.add('btn-secondary');
        }
    },

    toggleCustomPeriod() {
        const period = document.getElementById('spendingPeriod')?.value;
        document.getElementById('customPeriodGroup')?.classList.toggle('hidden', period !== 'custom');
    },

    saveSetup() {
        const budget = parseFloat(document.getElementById('monthlyBudget').value);
        const savingsGoal = parseFloat(document.getElementById('savingsGoal').value);

        if (isNaN(budget) || budget <= 0) {
            alert('Please enter a valid monthly budget greater than 0');
            return;
        }

        if (!isNaN(savingsGoal) && savingsGoal > budget) {
            alert('Savings goal cannot be greater than your monthly budget.');
            return;
        }

        this.data.budget = budget;
        this.data.savingsGoal = isNaN(savingsGoal) ? 0 : savingsGoal;
        localStorage.setItem('budgetTrackerMonth', this.getCurrentMonthKey());
        this.saveData();
        this.hideSetupModal();
        this.updateUI();
        this.switchPage('summary');
        alert('Setup saved successfully!');
    },

    saveBudgetSettings() {
        const budget = parseFloat(document.getElementById('summaryMonthlyBudgetInput').value);
        const savingsGoal = parseFloat(document.getElementById('summarySavingsGoalInput').value);

        if (isNaN(budget) || budget <= 0) {
            alert('Please enter a valid monthly budget greater than 0');
            return;
        }

        if (!isNaN(savingsGoal) && savingsGoal > budget) {
            alert('Savings goal cannot be greater than your monthly budget.');
            return;
        }

        this.data.budget = budget;
        this.data.savingsGoal = isNaN(savingsGoal) ? 0 : savingsGoal;
        this.saveData();
        this.updateUI();
        this.renderSummary();
        alert('Monthly budget and savings goal updated');
    },

    populateSummaryBudgetInputs() {
        const budgetInput = document.getElementById('summaryMonthlyBudgetInput');
        const savingsInput = document.getElementById('summarySavingsGoalInput');

        if (budgetInput) {
            budgetInput.value = this.data.budget ? this.data.budget.toFixed(2) : '';
        }
        if (savingsInput) {
            savingsInput.value = this.data.savingsGoal ? this.data.savingsGoal.toFixed(2) : '';
        }
    },

    addCategory() {
        const name = document.getElementById('newCategoryName').value.trim();
        const limit = parseFloat(document.getElementById('newCategoryLimit').value);

        if (!name) {
            alert('Please enter a category name');
            return;
        }

        if (this.data.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            alert('This category already exists');
            return;
        }

        this.data.categories.push({ name, limit: isNaN(limit) ? null : limit });

        this.saveData();
        this.renderCategories();
        this.renderFilterCategories();
        this.updateSpendingCategorySelect();

        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryLimit').value = '';
    },

    addLimitCategory() {
        const name = document.getElementById('limitCategoryName').value.trim();
        const limit = parseFloat(document.getElementById('limitCategoryAmount').value);

        if (!name) {
            alert('Please enter a category name');
            return;
        }

        const existingCategory = this.data.categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());

        if (existingCategory) {
            existingCategory.limit = isNaN(limit) ? null : limit;
        } else {
            this.data.categories.push({ name, limit: isNaN(limit) ? null : limit });
        }

        this.saveData();
        this.renderCategories();
        this.renderFilterCategories();
        this.updateSpendingCategorySelect();
        this.renderLimitsPage();
        this.renderLimitsBreakdown();

        document.getElementById('limitCategoryName').value = '';
        document.getElementById('limitCategoryAmount').value = '';
    },

    saveLimits() {
        const inputs = document.querySelectorAll('.limit-input');
        let totalLimit = 0;
        let invalidValue = false;

        for (const input of inputs) {
            const raw = input.value.trim();
            if (raw === '') continue;
            const value = parseFloat(raw);
            if (isNaN(value) || value < 0) {
                invalidValue = true;
                break;
            }
            totalLimit += value;
        }

        if (invalidValue) {
            alert('Please enter valid non-negative limit values.');
            return;
        }

        const budgetLimit = this.data.budget || 0;
        const safeLimit = Math.max(0, budgetLimit - this.data.savingsGoal);

        if (totalLimit > budgetLimit) {
            alert('Total category limits cannot be more than your monthly budget.');
            return;
        }

        if (totalLimit > safeLimit) {
            const proceed = confirm('Your total category limits are larger than your remaining budget after savings goal. Do you want to continue?');
            if (!proceed) return;
        }

        for (const input of inputs) {
            const name = input.dataset.category;
            const category = this.data.categories.find(cat => cat.name === name);
            if (!category) continue;

            const raw = input.value.trim();
            category.limit = raw === '' ? null : parseFloat(raw);
        }

        this.saveData();
        this.renderCategories();
        this.renderFilterCategories();
        this.updateSpendingCategorySelect();
        this.renderLimitsPage();
        this.renderLimitsBreakdown();
        alert('Category limits saved successfully.');
    },

    renderLimitsPage() {
        const limitsList = document.getElementById('limitsCategoryList');
        if (!limitsList) return;
        limitsList.innerHTML = '';

        if (this.data.categories.length === 0) {
            limitsList.innerHTML = '<p class="empty-state-text">No categories yet. Add one above.</p>';
            return;
        }

        this.data.categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-item';
            card.innerHTML = `
                <div class="category-item-info">
                    <div class="category-name">${this.escapeHtml(category.name)}</div>
                    <div class="category-limit">Current limit: ${category.limit !== null ? '$' + category.limit.toFixed(2) : 'No limit'}</div>
                </div>
                <div class="category-item-actions" style="min-width: 220px; display: flex; align-items: center; gap: 8px;">
                    <input type="number" class="limit-input" data-category="${this.escapeHtml(category.name)}" value="${category.limit !== null ? category.limit : ''}" min="0" step="0.01" placeholder="Set limit">
                    <button class="btn-danger" onclick="app.deleteCategory(${this.data.categories.indexOf(category)})">Delete</button>
                </div>
            `;
            limitsList.appendChild(card);
        });
    },

    renderLimitsBreakdown() {
        const limitsBreakdownList = document.getElementById('limitsBreakdownList');
        if (!limitsBreakdownList) return;
        limitsBreakdownList.innerHTML = '';

        if (this.data.categories.length === 0) {
            limitsBreakdownList.innerHTML = '<p class="empty-state-text">No categories available to display yet.</p>';
            return;
        }

        this.data.categories.forEach((category) => {
            const spent = this.getMonthlyEntries().filter(item => item.category === category.name && item.type === 'outcome').reduce((sum, item) => sum + item.amount, 0);
            const limit = category.limit !== null ? category.limit : 0;
            const percentage = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const remaining = limit - spent;
            const over = spent > limit;

            const card = document.createElement('div');
            card.className = `category-breakdown-item${over ? ' category-breakdown-warning' : ''}`;
            card.innerHTML = `
                <div class="category-breakdown-header">
                    <div>
                        <div class="category-breakdown-name">${this.escapeHtml(category.name)}</div>
                        <div class="category-breakdown-limit">Current limit: ${limit > 0 ? '$' + limit.toFixed(2) : 'No limit set'}</div>
                    </div>
                    <button class="btn-edit" onclick="app.editCategoryLimit(${this.data.categories.indexOf(category)})">Edit Limit</button>
                </div>
                <div class="category-breakdown-progress">
                    <div class="category-breakdown-progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="category-breakdown-stats">
                    <span class="category-breakdown-spent">Spent: $${spent.toFixed(2)}</span>
                    <span>${over ? 'Over by $' + (spent - limit).toFixed(2) : 'Remaining: $' + remaining.toFixed(2)}</span>
                </div>
            `;
            limitsBreakdownList.appendChild(card);
        });
    },

    deleteCategory(index) {
        if (confirm('Are you sure you want to delete this category?')) {
            this.data.categories.splice(index, 1);
            this.saveData();
            this.renderCategories();
            this.renderFilterCategories();
            this.updateSpendingCategorySelect();
            this.renderLimitsPage();
            this.renderLimitsBreakdown();
        }
    },

    editCategoryLimit(index) {
        const category = this.data.categories[index];
        const newLimit = prompt(`Enter new limit for ${category.name} (leave empty for no limit):`, category.limit || '');

        if (newLimit === null) return;

        if (newLimit === '') {
            category.limit = null;
        } else {
            const limit = parseFloat(newLimit);
            if (isNaN(limit) || limit < 0) {
                alert('Please enter a valid limit');
                return;
            }
            category.limit = limit;
        }

        this.saveData();
        this.renderCategories();
        this.renderLimitsPage();
        this.renderLimitsBreakdown();
        this.updateUI();
    },

    renderCategories() {
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;
        categoryList.innerHTML = '';

        this.data.categories.forEach((category, index) => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-item-info">
                    <div class="category-name">${this.escapeHtml(category.name)}</div>
                    <div class="category-limit">Limit: ${category.limit ? '$' + category.limit.toFixed(2) : 'No limit'}</div>
                </div>
                <div class="category-item-actions">
                    <button class="btn-edit" onclick="app.editCategoryLimit(${index})">Edit</button>
                    <button class="btn-danger" onclick="app.deleteCategory(${index})">Delete</button>
                </div>
            `;
            categoryList.appendChild(categoryItem);
        });
    },

    updateSpendingCategorySelect() {
        const select = document.getElementById('spendingCategory');
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a category</option>';

        this.data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });

        select.value = currentValue;
    },

    renderFilterCategories() {
        const select = document.getElementById('filterCategory');
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">All Categories</option>';

        this.data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });

        select.value = currentValue;
    },

    addSpending() {
        if (this.currentSpendingMode === 'fixed') {
            this.addFixedSpending();
            return;
        }

        const amount = parseFloat(document.getElementById('spendingAmount').value);
        const type = document.getElementById('spendingType').value;
        const date = document.getElementById('spendingDate').value;
        const category = document.getElementById('spendingCategory').value;

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!date) {
            alert('Please select a date');
            return;
        }
        if (!category) {
            alert('Please select a category');
            return;
        }

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (selectedDate > today) {
            alert('You cannot add spending for a future date.');
            return;
        }

        this.data.spendings.push({ amount, type, date, category });
        this.saveData();
        this.updateUI();

        document.getElementById('spendingAmount').value = '';
        document.getElementById('spendingType').value = 'outcome';
        document.getElementById('spendingDate').valueAsDate = new Date();
        document.getElementById('spendingCategory').value = '';

        alert('Spending added successfully!');
    },

    addFixedSpending() {
        const amount = parseFloat(document.getElementById('spendingAmount').value);
        const type = document.getElementById('spendingType').value;
        const category = document.getElementById('spendingCategory').value;
        const period = document.getElementById('spendingPeriod').value;
        const customPeriod = document.getElementById('customPeriodText').value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!category) {
            alert('Please select a category');
            return;
        }

        const recurrence = period === 'custom' ? (customPeriod || 'custom') : period;

        this.data.fixedSpendings.push({
            amount,
            type,
            category,
            period: recurrence,
            customPeriod,
            startDate: document.getElementById('spendingDate').value || new Date().toISOString().slice(0, 10)
        });

        this.saveData();
        this.updateUI();
        this.renderFixedSpendings();
        document.getElementById('spendingAmount').value = '';
        document.getElementById('spendingType').value = 'outcome';
        document.getElementById('spendingDate').valueAsDate = new Date();
        document.getElementById('spendingCategory').value = '';
        document.getElementById('spendingPeriod').value = 'daily';
        document.getElementById('customPeriodText').value = '';
        this.toggleCustomPeriod();

        alert('Fixed spending added successfully!');
    },

    renderFixedSpendings() {
        const list = document.getElementById('fixedSpendingsList');
        if (!list) return;
        list.innerHTML = '';

        if (!this.data.fixedSpendings || this.data.fixedSpendings.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📌</div><div class="empty-state-text">No fixed spending added yet.</div></div>';
            return;
        }

        this.data.fixedSpendings.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'history-item';
            card.innerHTML = `
                <div class="history-item-info">
                    <div class="history-item-category">${this.escapeHtml(item.category)} <span style="font-size:12px;color:#888;">(Fixed)</span></div>
                    <div class="history-item-meta"><span>${item.period}</span><span>Start: ${item.startDate}</span></div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="history-item-amount ${item.type === 'income' ? 'income' : 'outcome'}">${item.type === 'income' ? '+' : '-'}$${item.amount.toFixed(2)}</div>
                    <button class="btn-edit" onclick="app.editFixedSpending(${index})">Edit</button>
                    <button class="btn-danger" onclick="app.deleteFixedSpending(${index})">Delete</button>
                </div>
            `;
            list.appendChild(card);
        });
    },

    editFixedSpending(index) {
        const item = this.data.fixedSpendings[index];
        if (!item) return;

        this.editingFixedIndex = index;
        this.populateFixedEditForm(item);
        this.showFixedEditModal();
    },

    populateFixedEditForm(item) {
        const fixedEditCategory = document.getElementById('fixedEditCategory');
        if (fixedEditCategory) {
            fixedEditCategory.innerHTML = '';
            this.data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                if (category.name === item.category) option.selected = true;
                fixedEditCategory.appendChild(option);
            });
        }

        document.getElementById('fixedEditAmount').value = item.amount || '';
        document.getElementById('fixedEditPeriod').value = item.period || 'daily';
        document.getElementById('fixedEditCustomPeriod').value = item.customPeriod || '';
        document.getElementById('fixedEditStartDate').value = item.startDate || new Date().toISOString().slice(0, 10);
        this.toggleFixedEditCustomPeriod();
    },

    toggleFixedEditCustomPeriod() {
        const period = document.getElementById('fixedEditPeriod').value;
        document.getElementById('fixedEditCustomGroup').hidden = period !== 'custom';
    },

    showFixedEditModal() {
        document.getElementById('fixedEditModal')?.classList.remove('hidden');
    },

    hideFixedEditModal() {
        document.getElementById('fixedEditModal')?.classList.add('hidden');
        this.editingFixedIndex = null;
    },

    saveFixedSpendingEdit() {
        if (this.editingFixedIndex === null || this.editingFixedIndex === undefined) return;

        const item = this.data.fixedSpendings[this.editingFixedIndex];
        if (!item) return;

        const amount = parseFloat(document.getElementById('fixedEditAmount').value);
        const category = document.getElementById('fixedEditCategory').value;
        const period = document.getElementById('fixedEditPeriod').value;
        const customPeriod = document.getElementById('fixedEditCustomPeriod').value.trim();
        const startDate = document.getElementById('fixedEditStartDate').value;

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!category) {
            alert('Please select a category');
            return;
        }
        if (!startDate) {
            alert('Please select a start date');
            return;
        }

        item.amount = amount;
        item.category = category;
        item.period = period;
        item.customPeriod = period === 'custom' ? customPeriod : '';
        item.startDate = startDate;

        this.saveData();
        this.renderFixedSpendings();
        this.hideFixedEditModal();
        this.updateUI();
        this.renderHistory();
        alert('Fixed spending updated successfully.');
    },

    deleteFixedSpending(index) {
        if (confirm('Delete this fixed spending?')) {
            this.data.fixedSpendings.splice(index, 1);
            this.saveData();
            this.renderFixedSpendings();
        }
    },

    deleteSpending(index) {
        if (confirm('Are you sure you want to delete this spending record?')) {
            this.data.spendings.splice(index, 1);
            this.saveData();
            this.updateUI();
            this.renderHistory();
        }
    },

    filterHistory() {
        this.renderHistory();
    },

    resetFilters() {
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterType').value = '';
        this.renderHistory();
    },

    getMonthlyEntries() {
        const allEntries = [...this.data.spendings];

        (this.data.fixedSpendings || []).forEach((item, index) => {
            const start = new Date(item.startDate || new Date().toISOString().slice(0, 10));
            const end = new Date();
            const recurrence = this.getRecurrenceType(item.period, item.customPeriod);

            let current = new Date(start);
            while (current <= end) {
                const monthKey = current.toISOString().slice(0, 7);
                const currentMonth = new Date().toISOString().slice(0, 7);
                if (monthKey === currentMonth) {
                    allEntries.push({
                        amount: item.amount,
                        type: item.type,
                        date: current.toISOString().slice(0, 10),
                        category: item.category,
                        isFixed: true,
                        fixedLabel: item.period,
                        fixedIndex: index,
                        occurrenceDate: current.toISOString().slice(0, 10)
                    });
                }
                if (recurrence === 'daily') current.setDate(current.getDate() + 1);
                else if (recurrence === 'weekly') current.setDate(current.getDate() + 7);
                else if (recurrence === 'monthly') current.setMonth(current.getMonth() + 1);
                else current.setDate(current.getDate() + 1);
            }
        });

        return allEntries;
    },

    getRecurrenceType(period, customPeriod) {
        const text = `${period || ''} ${customPeriod || ''}`.toLowerCase();
        if (text.includes('month')) return 'monthly';
        if (text.includes('week')) return 'weekly';
        if (text.includes('day')) return 'daily';
        return 'daily';
    },

    renderHistory() {
        const categoryFilter = document.getElementById('filterCategory').value;
        const typeFilter = document.getElementById('filterType').value;
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        let filtered = this.getMonthlyEntries().filter(spending => {
            const categoryMatch = !categoryFilter || spending.category === categoryFilter;
            const typeMatch = !typeFilter || spending.type === typeFilter;
            return categoryMatch && typeMatch;
        });

        filtered.sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.amount - a.amount;
        });

        historyList.innerHTML = '';

        if (filtered.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-text">No spending records found</div>
                </div>
            `;
            return;
        }

        filtered.forEach((spending) => {
            const isOverLimit = this.isSpendingOverLimit(spending);
            const actualIndex = spending.isFixed ? -1 : this.data.spendings.indexOf(spending);
            const itemClass = `history-item ${spending.type}${isOverLimit ? ' over-limit' : ''}`;
            const amountClass = `history-item-amount ${spending.type}${isOverLimit ? ' over-limit' : ''}`;
            const formattedDate = new Date(spending.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

            const historyItem = document.createElement('div');
            historyItem.className = itemClass;
            historyItem.innerHTML = `
                <div class="history-item-info">
                    <div class="history-item-category">${this.escapeHtml(spending.category)}</div>
                    <div class="history-item-meta">
                        <span>${formattedDate}</span>
                        <span>${spending.type === 'income' ? 'Income' : 'Expense'}</span>
                        ${spending.isFixed ? '<span>Fixed</span>' : ''}
                        ${isOverLimit ? '<span style="color: #f44336; font-weight: bold;">Over Limit!</span>' : ''}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="${amountClass}">
                        ${spending.type === 'income' ? '+' : '-'}$${spending.amount.toFixed(2)}
                    </div>
                    ${spending.isFixed ? '' : `<button class="btn-danger" onclick="app.deleteSpending(${actualIndex})">Delete</button>`}
                </div>
            `;
            historyList.appendChild(historyItem);
        });
    },

    isSpendingOverLimit(spending) {
        if (spending.type === 'income') return false;

        const category = this.data.categories.find(cat => cat.name === spending.category);
        if (!category || category.limit === null) return false;

        const totalInCategory = this.getMonthlyEntries().filter(s => s.category === spending.category && s.type === 'outcome').reduce((sum, s) => sum + s.amount, 0);
        return totalInCategory > category.limit;
    },

    renderSummary() {
        const entries = this.getMonthlyEntries();
        const totalSpent = entries.filter(s => s.type === 'outcome').reduce((sum, s) => sum + s.amount, 0);
        const totalEarned = entries.filter(s => s.type === 'income').reduce((sum, s) => sum + s.amount, 0);
        const netDifference = totalEarned - totalSpent;
        const remaining = this.data.budget - totalSpent;

        document.getElementById('summarySpent').textContent = '$' + totalSpent.toFixed(2);
        document.getElementById('summaryEarned').textContent = '$' + totalEarned.toFixed(2);
        document.getElementById('summaryDifference').textContent = '$' + Math.abs(netDifference).toFixed(2);
        document.getElementById('summaryDifference').className = netDifference >= 0 ? 'summary-value earned' : 'summary-value';
        document.getElementById('summaryRemaining').textContent = '$' + remaining.toFixed(2);
        document.getElementById('summaryRemaining').className = remaining >= 0 ? 'summary-value' : 'summary-value';

        if (this.data.savingsGoal > 0) {
            const savedAmount = Math.max(0, remaining);
            const goalReached = savedAmount >= this.data.savingsGoal;
            document.getElementById('summarySavingsGoal').textContent = '$' + this.data.savingsGoal.toFixed(2);
            document.getElementById('savingsStatus').textContent = goalReached ? '✓ Goal Reached!' : `$${(this.data.savingsGoal - savedAmount).toFixed(2)} to go`;
            document.getElementById('savingsStatus').className = goalReached ? 'summary-value earned' : 'summary-value';
        } else {
            document.getElementById('summarySavingsGoal').textContent = 'Not Set';
            document.getElementById('savingsStatus').textContent = 'Not Set';
        }

        this.populateSummaryBudgetInputs();
        this.renderCategoryBreakdown();
    },

    renderCategoryBreakdown() {
        const categoriesBreakdown = document.getElementById('categoriesBreakdown');
        if (!categoriesBreakdown) return;
        categoriesBreakdown.innerHTML = '';

        if (this.data.categories.length === 0) {
            categoriesBreakdown.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-text">Add categories first to see spending proportions.</div>
                </div>
            `;
            return;
        }

        const entries = this.getMonthlyEntries();
        const totalSpent = entries.filter(s => s.type === 'outcome').reduce((sum, s) => sum + s.amount, 0);

        if (totalSpent === 0) {
            categoriesBreakdown.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📉</div>
                    <div class="empty-state-text">No spending recorded yet. Add spendings to see category proportions.</div>
                </div>
            `;
            return;
        }

        const chartGrid = document.createElement('div');
        chartGrid.className = 'category-chart-grid';

        this.data.categories.forEach((category, index) => {
            const spent = entries.filter(s => s.category === category.name && s.type === 'outcome').reduce((sum, s) => sum + s.amount, 0);
            const proportion = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
            const clipped = Math.min(100, Math.max(0, proportion));
            const color = this.getCategoryChartColor(index);

            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-proportion-item';
            categoryItem.innerHTML = `
                <div class="category-proportion-circle" style="background: conic-gradient(${color} ${clipped}%, #e5e7eb ${clipped}% 100%);">
                    <span>${clipped.toFixed(1)}%</span>
                </div>
                <div class="category-proportion-details">
                    <div class="category-proportion-name">${this.escapeHtml(category.name)}</div>
                    <div class="category-proportion-text">Spent: $${spent.toFixed(2)}</div>
                    <div class="category-proportion-text">Share of total spending: ${clipped.toFixed(1)}%</div>
                </div>
            `;
            chartGrid.appendChild(categoryItem);
        });

        categoriesBreakdown.appendChild(chartGrid);
    },

    getCategoryChartColor(index) {
        const palette = ['#667eea', '#4CAF50', '#FB8C00', '#E53935', '#8E24AA', '#039BE5', '#FDD835', '#5E35B1'];
        return palette[index % palette.length];
    },

    showSetupModal() {
        document.getElementById('setup')?.classList.remove('hidden');
    },

    hideSetupModal() {
        document.getElementById('setup')?.classList.add('hidden');
    },

    updateUI() {
        this.updateSidebar();
        this.updateSpendingCategorySelect();
        this.renderFixedSpendings();
    },

    updateSidebar() {
        const entries = this.getMonthlyEntries();
        const totalSpent = entries.filter(s => s.type === 'outcome').reduce((sum, s) => sum + s.amount, 0);
        const totalEarned = entries.filter(s => s.type === 'income').reduce((sum, s) => sum + s.amount, 0);
        const remaining = this.data.budget - totalSpent;

        document.getElementById('budgetDisplay').textContent = '$' + this.data.budget.toFixed(2);
        document.getElementById('spentDisplay').textContent = '$' + totalSpent.toFixed(2);
        document.getElementById('earnedDisplay').textContent = '$' + totalEarned.toFixed(2);
        document.getElementById('remainingDisplay').textContent = '$' + remaining.toFixed(2);
        document.getElementById('goalDisplay').textContent = '$' + this.data.savingsGoal.toFixed(2);

        this.updateProgressBar(totalSpent);
    },

    updateProgressBar(totalSpent) {
        const progressFill = document.getElementById('progressFill');
        const zeroLine = document.getElementById('zeroLine');
        const savingsLine = document.getElementById('savingsLine');

        if (!progressFill || !zeroLine || !savingsLine) return;

        if (this.data.budget === 0) {
            progressFill.style.width = '0%';
            zeroLine.style.left = '0%';
            return;
        }

        const percentage = Math.min(100, (totalSpent / this.data.budget) * 100);
        progressFill.style.width = percentage + '%';
        zeroLine.style.left = '100%';

        if (this.data.savingsGoal > 0) {
            const savingsPercentage = ((this.data.budget - this.data.savingsGoal) / this.data.budget) * 100;
            savingsLine.style.left = savingsPercentage + '%';
            savingsLine.style.display = 'block';
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
    },

    saveData() {
        saveBudgetData(this.data);
    },

    loadData() {
        const parsed = loadBudgetData();
        if (parsed) this.data = parsed;
    }
};

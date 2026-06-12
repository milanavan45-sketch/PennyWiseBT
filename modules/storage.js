export function getStorageKey() {
    return window.USER_DATA_KEY || 'budgetTrackerData';
}

export function saveBudgetData(data) {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

export function loadBudgetData() {
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) return null;

    try {
        const parsed = JSON.parse(stored);
        return {
            budget: Number(parsed.budget) || 0,
            savingsGoal: Number(parsed.savingsGoal) || 0,
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            spendings: Array.isArray(parsed.spendings) ? parsed.spendings : [],
            fixedSpendings: Array.isArray(parsed.fixedSpendings) ? parsed.fixedSpendings : []
        };
    } catch (error) {
        console.error('Failed to load saved budget data:', error);
        return null;
    }
}

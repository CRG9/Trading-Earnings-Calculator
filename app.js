// 1. Import the 'annualizeProfits' function from your main logic file.
import { annualizeProfits } from './main.js';

// --- Global DOM Elements & Helpers ---
const outputDiv = document.getElementById('simulator-embed');
const simulationButton = document.getElementById('run-simulation');
const inputsToFormat = document.querySelectorAll('#account-balance-visible, #win-rate-visible, #risk-to-reward-visible, #estimated-fee-percent-visible, #account-balance-risked-percent-visible, #total-monthly-expenses-visible, #expenses-begin-month-visible, #timeline-visible');

// --- DELAY HELPER ---
// New helper function to create a pause.
const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper function for console output formatting.
const formatConsoleCurrency = (number) => {
    return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper for VISIBLE input formatting.
const formatVisibleCurrency = (number) => {
    return number.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

// --- Console Output Override ---
const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    const p = document.createElement('p');
    p.textContent = args.join(' ');
    p.style.padding = '0.25rem';
    outputDiv.appendChild(p);
    // Auto-scroll to the bottom
    outputDiv.scrollTop = outputDiv.scrollHeight;
};

// --- Input Formatting and Syncing Logic ---
function updateAndFormatInput(event) {
    const visibleInput = event.target;
    const hiddenInput = document.getElementById(visibleInput.id.replace('-visible', ''));

    if (!hiddenInput) return;

    const cleanValue = visibleInput.value.replace(/[^0-9.-]/g, '');
    hiddenInput.value = cleanValue;

    if (cleanValue) {
        const numberValue = parseFloat(cleanValue);
        let formattedValue = numberValue;

        switch (visibleInput.id) {
            case 'account-balance-visible':
            case 'total-monthly-expenses-visible':
                formattedValue = formatVisibleCurrency(numberValue);
                break;
            case 'win-rate-visible':
            case 'estimated-fee-percent-visible':
            case 'account-balance-risked-percent-visible':
                formattedValue = `${numberValue}%`;
                break;
            case 'risk-to-reward-visible':
                formattedValue = `1:${numberValue}`;
                break;
            case 'expenses-begin-month-visible':
                if (numberValue === -1) {
                    formattedValue = 'Disabled';
                } else {
                    formattedValue = `${numberValue} Month`;
                }
                break;
            case 'timeline-visible':
                if (numberValue === 1) {
                    formattedValue = '1 Month';
                } else {
                    formattedValue = `${numberValue} Months`;
                }
                break;
        }
        visibleInput.value = formattedValue;
    }
}

inputsToFormat.forEach(input => {
    input.addEventListener('blur', updateAndFormatInput);
});

// --- Data Gathering & Validation ---
function getAndValidateInputs() {
    const params = {
        startingBalance: parseFloat(document.getElementById('account-balance').value),
        riskPerTrade: parseFloat(document.getElementById('account-balance-risked-percent').value) / 100,
        tradesPerWeek: parseInt(document.getElementById('trades-per-week').value, 10),
        winRate: parseFloat(document.getElementById('win-rate').value) / 100,
        riskToReward: parseFloat(document.getElementById('risk-to-reward').value),
        expensesBegin: parseInt(document.getElementById('expenses-begin-month').value, 10),
        totalMonthlyExpenses: parseFloat(document.getElementById('total-monthly-expenses').value),
        simulationTimeline: parseInt(document.getElementById('timeline').value, 10),
        myFeePercentage: parseFloat(document.getElementById('estimated-fee-percent').value) / 100,
    };

    for (const key in params) {
        if (isNaN(params[key])) {
            return null;
        }
    }
    return params;
}

// --- Main Simulation Function ---
// MODIFIED: Function is now async and handles button state.
async function runSimulation() {
    simulationButton.disabled = true; // Disable button
    outputDiv.innerHTML = '';
    
    const shortDelay = 200;
    const longDelay = 400;

    const params = getAndValidateInputs();

    if (params === null) {
        console.log("\n--- Simulation Aborted ---");
        await delay(shortDelay);
        console.log("Error: Please ensure all fields are filled out with valid numbers.");
        simulationButton.disabled = false; // Re-enable button
        return;
    }

    const {
        startingBalance, riskPerTrade, tradesPerWeek, winRate,
        riskToReward, totalMonthlyExpenses, expensesBegin,
        simulationTimeline, myFeePercentage
    } = params;
    
    const monthlyProfits = annualizeProfits(startingBalance, riskPerTrade, tradesPerWeek, winRate, riskToReward, totalMonthlyExpenses, expensesBegin, simulationTimeline, myFeePercentage);

    // --- Display Results (with delays) ---
    console.log("\n--- Simulation Beginning ---");
    await delay(longDelay);

    console.log(`Initial Account Balance: ${formatVisibleCurrency(startingBalance)}`);
    await delay(shortDelay);

    console.log(`Total Monthly Expenses: $${formatConsoleCurrency(totalMonthlyExpenses)}`);
    await delay(longDelay);

    console.log("\nMonthly Breakdown:");
    await delay(longDelay);
    
    // MODIFIED: Changed forEach to a for...of loop to support await.
    for (const [index, monthData] of monthlyProfits.entries()) {
        const grossText = `Trade Profit: $${formatConsoleCurrency(monthData.grossProfit)}`;
        const expenseText = `| Expenses: $${formatConsoleCurrency(monthData.expensesDeducted)}`;
        const netText = `| Net Profit: $${formatConsoleCurrency(monthData.netProfit)}`;
        const balanceText = `| Ending Balance: $${formatConsoleCurrency(monthData.endBalance)}`;
        console.log(`Month ${index + 1}: ${grossText.padEnd(25)} ${expenseText.padEnd(25)} ${netText.padEnd(25)} ${balanceText}`);
        await delay(shortDelay); // Pause after each month's line
    }

    // --- Annual Summary (with delays) ---
    console.log("\n--- Simulation Period Summary ---");
    await delay(longDelay);

    const totalNetProfit = monthlyProfits.reduce((sum, monthData) => sum + monthData.netProfit, 0);
    const totalGrossProfit = monthlyProfits.reduce((sum, monthData) => sum + monthData.grossProfit, 0);
    const totalExpenses = totalGrossProfit - totalNetProfit;
    const finalBalance = startingBalance + totalNetProfit;

    console.log(`Total Trading Profits: $${formatConsoleCurrency(totalGrossProfit)}`);
    await delay(shortDelay);

    console.log(`Total Deducted Expenses: $${formatConsoleCurrency(totalExpenses)}`);
    await delay(shortDelay);

    console.log(`Total Net Profit for the Period: $${formatConsoleCurrency(totalNetProfit)}`);
    await delay(shortDelay);
    
    console.log(`Final Account Balance: $${formatConsoleCurrency(finalBalance)}`);
    await delay(longDelay);
    
    console.log("\n--- Simulation Complete ---");
    await delay(longDelay);
    
    simulationButton.disabled = false; // Re-enable button at the end
}

// --- Event Listener & Initial Display ---
// MODIFIED: Wrapped initial logs in an async IIFE for a delayed startup effect.
(async () => {
    console.log("\nBooting Up Simulator...");
    await delay(1000);
    console.log("Please enter your inputs then press the button.");
})();

simulationButton.addEventListener('click', runSimulation);
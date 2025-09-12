// 1. Import the 'annualizeProfits' function from your main logic file.
import { annualizeProfits } from './main.js';

// --- Global DOM Elements & Helpers ---
const outputDiv = document.getElementById('simulator-embed');
const simulationButton = document.getElementById('run-simulation');
const inputsToFormat = document.querySelectorAll('#account-balance-visible, #win-rate-visible, #risk-to-reward-visible, #estimated-fee-percent-visible, #account-balance-risked-percent-visible, #total-monthly-expenses-visible, #expenses-begin-month-visible, #timeline-visible');

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
function runSimulation() {
    outputDiv.innerHTML = '';
    const params = getAndValidateInputs();

    if (params === null) {
        console.log("\n--- Simulation Aborted ---");
        console.log("Error: Please ensure all fields are filled out with valid numbers.");
        return;
    }

    const {
        startingBalance, riskPerTrade, tradesPerWeek, winRate,
        riskToReward, totalMonthlyExpenses, expensesBegin,
        simulationTimeline, myFeePercentage
    } = params;
    
    const monthlyProfits = annualizeProfits(startingBalance, riskPerTrade, tradesPerWeek, winRate, riskToReward, totalMonthlyExpenses, expensesBegin, simulationTimeline, myFeePercentage);

    // --- Display Results ---
    console.log("\n--- Simulation Complete ---");
    console.log(`Initial Account Balance: ${formatVisibleCurrency(startingBalance)}`);
    console.log(`Total Monthly Expenses: $${formatConsoleCurrency(totalMonthlyExpenses)}`);
    console.log("\nMonthly Breakdown:");
    
    // --- CHANGE IS HERE ---
    // Loop now prints Expenses Deducted in its own column.
    monthlyProfits.forEach((monthData, index) => {
        const grossText = `Trade Profit: $${formatConsoleCurrency(monthData.grossProfit)}`;
        const expenseText = `| Expenses: $${formatConsoleCurrency(monthData.expensesDeducted)}`;
        const netText = `| Net Profit: $${formatConsoleCurrency(monthData.netProfit)}`;
        const balanceText = `| Ending Balance: $${formatConsoleCurrency(monthData.endBalance)}`;
        console.log(`Month ${index + 1}: ${grossText.padEnd(25)} ${expenseText.padEnd(25)} ${netText.padEnd(25)} ${balanceText}`);
    });

    // --- Annual Summary ---
    console.log("\n--- Simulation Period Summary ---");

    const totalNetProfit = monthlyProfits.reduce((sum, monthData) => sum + monthData.netProfit, 0);
    const totalGrossProfit = monthlyProfits.reduce((sum, monthData) => sum + monthData.grossProfit, 0);
    const totalExpenses = totalGrossProfit - totalNetProfit;
    const finalBalance = startingBalance + totalNetProfit;

    console.log(`Total Trading Profits: $${formatConsoleCurrency(totalGrossProfit)}`);
    console.log(`Total Deducted Expenses: $${formatConsoleCurrency(totalExpenses)}`);
    console.log(`Total Net Profit for the Period: $${formatConsoleCurrency(totalNetProfit)}`);
    console.log(`Final Account Balance: $${formatConsoleCurrency(finalBalance)}`);
}

// --- Event Listener ---
console.log("\nBooting Up Simulator...");
console.log("Please enter your inputs then press the button.");
simulationButton.addEventListener('click', runSimulation);
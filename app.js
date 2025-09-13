// 1. Import the main simulation function from your logic file.
import { runMonteCarlo } from './main.js';

// --- Global DOM Elements & Helpers ---
const outputDiv = document.getElementById('simulator-embed');
const simulationButton = document.getElementById('run-simulation');
const inputsToFormat = document.querySelectorAll('#account-balance-visible, #win-rate-visible, #risk-to-reward-visible, #estimated-fee-percent-visible, #account-balance-risked-percent-visible, #total-monthly-expenses-visible, #expenses-begin-month-visible, #timeline-visible, #simulation-runs-visible');

// --- A global variable to direct console output ---
let activeView;

// --- DELAY HELPER ---
const delay = ms => new Promise(res => setTimeout(res, ms));

// --- FORMATTING HELPERS ---
const formatConsoleCurrency = (number) => {
    return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatVisibleCurrency = (number) => {
    return number.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

// --- Console Output Override ---
const originalConsoleLog = console.log;
console.log = function(message, onClickCallback) {
    originalConsoleLog(message);
    const p = document.createElement('p');
    p.textContent = message;
    p.style.padding = '0.25rem';

    if (onClickCallback && typeof onClickCallback === 'function') {
        p.classList.add('clickable');
        p.addEventListener('click', onClickCallback);
    }

    if (activeView) {
        activeView.appendChild(p);
    } else {
        outputDiv.appendChild(p);
    }
    
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
                formattedValue = (numberValue === -1) ? 'Disabled' : `${numberValue} Month`;
                break;
            case 'timeline-visible':
                formattedValue = (numberValue === 1) ? '1 Month' : `${numberValue} Months`;
                break;
            case 'simulation-runs-visible':
                formattedValue = (numberValue === 1) ? '1 Run' : `${numberValue.toLocaleString()} Runs`;
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
        // Use the OR || operator to assign a default if the input is empty
        startingBalance: parseFloat(document.getElementById('account-balance').value) || 25000,
        riskPerTrade: (parseFloat(document.getElementById('account-balance-risked-percent').value) || 2) / 100,
        tradesPerWeek: parseInt(document.getElementById('trades-per-week').value, 10) || 10,
        winRate: (parseFloat(document.getElementById('win-rate').value) || 50) / 100,
        riskToReward: parseFloat(document.getElementById('risk-to-reward').value) || 2,
        expensesBegin: parseInt(document.getElementById('expenses-begin-month').value, 10) || 4,
        totalMonthlyExpenses: parseFloat(document.getElementById('total-monthly-expenses').value) || 4000,
        simulationTimeline: parseInt(document.getElementById('timeline').value, 10) || 1,
        simulationRuns: parseInt(document.getElementById('simulation-runs').value, 10) || 1000,
        myFeePercentage: (parseFloat(document.getElementById('estimated-fee-percent').value) || 3) / 100,
    };

    // This loop now serves as a final check, though defaults should prevent NaNs
    for (const key in params) {
        if (isNaN(params[key])) {
            return "Error: An invalid non-numeric value was entered in one of the fields.";
        }
    }

    if (params.simulationRuns > 100000) {
        return "Error: Number of simulation runs cannot exceed 100,000.";
    }

    return params;
}

// --- Main Simulation Function ---
async function runSimulation() {
    simulationButton.disabled = true;
    outputDiv.innerHTML = '';
    
    const summaryView = document.createElement('div');
    const detailsView = document.createElement('div');
    detailsView.style.display = 'none';
    outputDiv.appendChild(summaryView);
    outputDiv.appendChild(detailsView);
    activeView = summaryView;
    let isViewTransitioning = false;
    const shortDelay = 400;
    const longDelay = 800;
    
    const validationResult = getAndValidateInputs();

    if (typeof validationResult === 'string') {
        console.log("\n--- Simulation Aborted ---");
        await delay(shortDelay);
        console.log(validationResult);
        simulationButton.disabled = false;
        return;
    }
    
    const params = validationResult;
    
    console.log("\n--- Running Monte Carlo Simulation ---");
    await delay(shortDelay);
    console.log(`Simulating ${params.simulationRuns.toLocaleString()} possible futures...`);
    await delay(longDelay);

    const simulationResults = runMonteCarlo(params, params.simulationRuns);

    const survivingRuns = simulationResults.filter(run => run.survived);
    survivingRuns.sort((a, b) => a.finalBalance - b.finalBalance);
    const survivalRate = (survivingRuns.length / params.simulationRuns) * 100;
    let averageBalance = 0;
    let medianScenario, bestCaseScenario, worstCaseScenario, averageScenario;
    if (survivingRuns.length > 0) {
        const finalBalances = survivingRuns.map(run => run.finalBalance);
        averageBalance = finalBalances.reduce((sum, val) => sum + val, 0) / finalBalances.length;
        worstCaseScenario = survivingRuns[0];
        bestCaseScenario = survivingRuns[survivingRuns.length - 1];
        medianScenario = survivingRuns[Math.floor(survivingRuns.length / 2)];
        averageScenario = survivingRuns.reduce((prev, curr) => (Math.abs(curr.finalBalance - averageBalance) < Math.abs(prev.finalBalance - averageBalance) ? curr : prev));
    }

    async function displayMonthlyBreakdown(title, monthlyData) {
        if (isViewTransitioning) return;
        isViewTransitioning = true;

        detailsView.innerHTML = '';
        activeView = detailsView;

        console.log(`\n--- ${title} ---`);
        await delay(longDelay);

        for (const [index, monthData] of monthlyData.entries()) {
            const grossText = `Trade Profit: $${formatConsoleCurrency(monthData.grossProfit)}`;
            const expenseText = `| Expenses: $${formatConsoleCurrency(monthData.expensesDeducted)}`;
            const netText = `| Net Profit: $${formatConsoleCurrency(monthData.netProfit)}`;
            const balanceText = `| Ending Balance: $${formatConsoleCurrency(monthData.endBalance)}`;
            console.log(`Month ${index + 1}: ${grossText.padEnd(25)} ${expenseText.padEnd(25)} ${netText.padEnd(25)} ${balanceText}`);
            await delay(100);
        }
        
        await delay(longDelay);
        console.log("\n« Return to Summary", () => {
            if (isViewTransitioning) return;
            isViewTransitioning = true;
            detailsView.style.display = 'none';
            summaryView.style.display = 'block';
            activeView = summaryView;
            setTimeout(() => { isViewTransitioning = false; }, 100);
        });

        summaryView.style.display = 'none';
        detailsView.style.display = 'block';
        isViewTransitioning = false;
    }
    
    console.log("\n--- Monte Carlo Simulation Results ---");
    await delay(longDelay);
    console.log(`Survival Rate: ${survivalRate.toFixed(2)}% of simulations were profitable or solvent.`);
    await delay(shortDelay);
    if (averageScenario) {
        console.log(`Average Final Balance: ${formatVisibleCurrency(averageBalance)}`, () => displayMonthlyBreakdown("Details for Average Scenario", averageScenario.monthlyData));
        await delay(shortDelay);
    }
    if (medianScenario) {
        console.log(`Median Final Balance: ${formatVisibleCurrency(medianScenario.finalBalance)} (50% of outcomes were better, 50% were worse)`, () => displayMonthlyBreakdown("Details for Median Scenario", medianScenario.monthlyData));
        await delay(shortDelay);
    }
    if (bestCaseScenario) {
        console.log(`Best Case Scenario: ${formatVisibleCurrency(bestCaseScenario.finalBalance)}`, () => displayMonthlyBreakdown("Details for Best Case Scenario", bestCaseScenario.monthlyData));
        await delay(shortDelay);
    }
    if (worstCaseScenario) {
        console.log(`Worst Case (surviving): ${formatVisibleCurrency(worstCaseScenario.finalBalance)}`, () => displayMonthlyBreakdown("Details for Worst Case Scenario", worstCaseScenario.monthlyData));
        await delay(longDelay);
    }
    console.log("\n--- Simulation Complete ---");
    simulationButton.disabled = false;
}

// --- Event Listener & Initial Display ---
(async () => {
    const initialView = document.createElement('div');
    outputDiv.appendChild(initialView);
    activeView = initialView;
    
    console.log("\nBooting Up Monte Carlo Simulator...");
    await delay(1000);
    console.log("Please enter your inputs then press the button.");
})();

simulationButton.addEventListener('click', runSimulation);
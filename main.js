/**
 * Calculates the estimated monthly profit from a trading strategy with fees.
 * This version uses a geometric compounding formula for a more realistic projection.
 *
 * @param {number} accountBalance The starting account balance (e.g., 10000).
 * @param {number} riskPercentage The percentage of the current balance to risk per trade (e.g., 0.02 for 2%).
 * @param {number} tradesPerWeek The average number of trades taken per week (e.g., 5).
 * @param {number} winPercentage The historical win rate of the strategy (e.g., 0.60 for 60%).
 * @param {number} riskToRewardRatio The strategy's risk-to-reward ratio (e.g., 2 for 1:2).
 * @param {number} feeAsPercentageOfRisk The broker fee expressed as a percentage of the amount risked (e.g., 0.014 for 1.4%).
 * @returns {number} The estimated net profit for the month.
 */
export function calculateMonthlyProfit(
    accountBalance,
    riskPercentage,
    tradesPerWeek,
    winPercentage,
    riskToRewardRatio,
    feeAsPercentageOfRisk
) {
    const tradesPerMonth = tradesPerWeek * 4;
    let currentBalance = accountBalance;

    // Loop through each trade individually for the month
    for (let i = 0; i < tradesPerMonth; i++) {
        // Stop if the account is blown
        if (currentBalance <= 0) {
            break;
        }

        // Determine the exact dollar amount to risk on this single trade
        const amountRisked = currentBalance * riskPercentage;

        // Use Math.random() to simulate the trade's outcome
        if (Math.random() < winPercentage) {
            // --- WIN ---
            // Profit = (Risk * RR) - (Fee)
            const profit = (amountRisked * riskToRewardRatio) - (amountRisked * feeAsPercentageOfRisk);
            currentBalance += profit;
        } else {
            // --- LOSS ---
            // Loss = (Risk) + (Fee)
            const loss = amountRisked + (amountRisked * feeAsPercentageOfRisk);
            currentBalance -= loss;
        }
    }

    // Return the net profit after all trades and fees
    return currentBalance - accountBalance;
}

/**
 * Simulates 12 months of trading, factoring in monthly expenses.
 * @param {number} monthlyExpenses - The total fixed expenses for one month.
 * @param {number} expensesBegin - The month index (0-11) when expenses start.
 * @returns {number[]} An array containing 12 months of net profit data.
 */

export function annualizeProfits(
    startingBalance,
    riskPercentage,
    tradesPerWeek,
    winPercentage,
    riskToRewardRatio,
    monthlyExpenses,
    expensesBegin,
    simulationTimeline,
    myFeePercentage
) {
    let currentBalance = startingBalance;
    const resultsArray = [];

    for (let i = 0; i < simulationTimeline; i++) {
        const grossMonthlyProfit = calculateMonthlyProfit(
            currentBalance,
            riskPercentage,
            tradesPerWeek,
            winPercentage,
            riskToRewardRatio,
            myFeePercentage
        );

        let netMonthlyProfit;
        if (expensesBegin >= 1 && i + 1 >= expensesBegin) {
            netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
        } else {
            netMonthlyProfit = grossMonthlyProfit;
        }

        // --- CHANGE IS HERE ---
        // 1. Calculate the specific expenses deducted this month.
        const expensesDeducted = grossMonthlyProfit - netMonthlyProfit;

        // 2. Update the balance with the net profit.
        currentBalance += netMonthlyProfit;

        // 3. Add expensesDeducted to the object we return.
        resultsArray.push({
            grossProfit: grossMonthlyProfit,
            expensesDeducted: expensesDeducted, // Added this line
            netProfit: netMonthlyProfit,
            endBalance: currentBalance
        });

        if (currentBalance <= 0) {
            break;
        }
    }

    return resultsArray;
}




/**
 * Calculates the estimated monthly profit from a trading strategy with fees.
 * (This function remains unchanged as its logic for a single month is correct)
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

    for (let i = 0; i < tradesPerMonth; i++) {
        if (currentBalance <= 0) {
            break;
        }
        const amountRisked = currentBalance * riskPercentage;
        if (Math.random() < winPercentage) {
            const profit = (amountRisked * riskToRewardRatio) - (amountRisked * feeAsPercentageOfRisk);
            currentBalance += profit;
        } else {
            const loss = amountRisked + (amountRisked * feeAsPercentageOfRisk);
            currentBalance -= loss;
        }
    }
    return currentBalance - accountBalance;
}

/**
 * Simulates one "lifetime" of trading over a given timeline.
 * (This function also remains unchanged)
 */
export function accumulateProfits(
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
            currentBalance, riskPercentage, tradesPerWeek, winPercentage,
            riskToRewardRatio, myFeePercentage
        );

        let netMonthlyProfit;
        if (expensesBegin >= 1 && i + 1 >= expensesBegin) {
            netMonthlyProfit = grossMonthlyProfit - monthlyExpenses;
        } else {
            netMonthlyProfit = grossMonthlyProfit;
        }

        const expensesDeducted = grossMonthlyProfit - netMonthlyProfit;
        currentBalance += netMonthlyProfit;

        resultsArray.push({
            grossProfit: grossMonthlyProfit,
            expensesDeducted: expensesDeducted,
            netProfit: netMonthlyProfit,
            endBalance: currentBalance
        });

        if (currentBalance <= 0) {
            break;
        }
    }
    return resultsArray;
}


/**
 * --- NEW FUNCTION ---
 * Runs the accumulateProfits simulation multiple times to generate a distribution of possible outcomes.
 * @param {object} params - An object containing all the parameters for the simulation.
 * @param {number} simulationRuns - The number of "lifetimes" to simulate (e.g., 10000).
 * @returns {object[]} An array where each element is the final state of a single simulation run.
 */
export function runMonteCarlo(params, simulationRuns) {
    const allRunsResults = [];

    for (let i = 0; i < simulationRuns; i++) {
        const singleRunResult = accumulateProfits(
            params.startingBalance,
            params.riskPerTrade,
            params.tradesPerWeek,
            params.winRate,
            params.riskToReward,
            params.totalMonthlyExpenses,
            params.expensesBegin,
            params.simulationTimeline,
            params.myFeePercentage
        );

        const finalMonth = singleRunResult.length > 0 ? singleRunResult[singleRunResult.length - 1] : null;

        if (finalMonth) {
            allRunsResults.push({
                finalBalance: finalMonth.endBalance,
                survived: true,
                monthlyData: singleRunResult // <-- KEY CHANGE: Include the full monthly breakdown
            });
        } else {
            allRunsResults.push({
                finalBalance: 0,
                survived: false,
                monthlyData: []
            });
        }
    }

    return allRunsResults;
}
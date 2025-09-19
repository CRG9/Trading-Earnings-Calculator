/**
 * Calculates the estimated monthly profit from a trading strategy with fees.
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
 * Simulates one "lifetime" scenario of trading over a given timeline.
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
            currentBalance,
            riskPercentage,
            tradesPerWeek,
            winPercentage,
            riskToRewardRatio,
            myFeePercentage
        );

        let netMonthlyProfit;
        if (expensesBegin > 0 && i + 1 >= expensesBegin) {
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
 * Runs the accumulateProfits simulation multiple times.
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
            const didSurvive = finalMonth.endBalance > 0;

            allRunsResults.push({
                finalBalance: finalMonth.endBalance,
                survived: didSurvive,
                monthlyData: singleRunResult
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
import { isReceiptApproved, normalizeReceiptStatus } from './receiptStatus';

/**
 * Financial calculation logic for the Sijilati System
 */

/**
 * Ensures value is a valid number
 * @param {any} value 
 * @returns {number}
 */
export const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    // Handle strings with commas
    if (typeof value === 'string') {
        const cleanValue = value.replace(/,/g, '');
        const parsed = parseFloat(cleanValue);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Rounds value to 2 decimal places safely
 * @param {number} value 
 * @returns {number}
 */
export const roundCurrency = (value) => (
    Math.round((toNumber(value) + Number.EPSILON) * 100) / 100
);

/**
 * Gets financial rates from settings with fallbacks
 */
const getFinancialRates = (globalSettings = {}) => ({
    partyADiscountRate: toNumber(globalSettings?.financials?.partyAPct) / 100,
    partyBDiscountRate: toNumber(globalSettings?.financials?.partyBPct) / 100,
    bankCommissionRate: toNumber(globalSettings?.financials?.bankCommRate) / 100,
    partyCFixedAmount: toNumber(globalSettings?.financials?.partyCAmount),
});

export const getLedgerRecordStatus = (record = {}) => (
    normalizeReceiptStatus(record?.status)
);

export const isLedgerRecordConfirmed = (record = {}) => (
    isReceiptApproved(record)
);

export const isLedgerRecordFrozen = (record = {}) => (
    getLedgerRecordStatus(record) === 'frozen'
);

export const isLedgerRecordPending = (record = {}) => (
    getLedgerRecordStatus(record) === 'pending'
);

/**
 * Calculates breakdown for a single ledger record
 */
export const calculateLedgerBreakdown = (amountValue, globalSettings) => {
    const gross = toNumber(amountValue);
    const { partyBDiscountRate, bankCommissionRate } = getFinancialRates(globalSettings);

    const discount = gross * partyBDiscountRate;
    const amountAfterDiscount = gross - discount;
    const bankComm = amountAfterDiscount * bankCommissionRate;
    const net = amountAfterDiscount - bankComm;

    return {
        gross: roundCurrency(gross),
        discount: roundCurrency(discount),
        amountAfterDiscount: roundCurrency(amountAfterDiscount),
        bankComm: roundCurrency(bankComm),
        net: roundCurrency(net),
    };
};

/**
 * Summarizes a list of ledger records
 */
export const summarizeLedgerRecords = (records = [], globalSettings) => (
    (records || []).reduce((acc, record) => {
        if (!isLedgerRecordConfirmed(record)) {
            return acc;
        }

        const breakdown = calculateLedgerBreakdown(record?.amount, globalSettings);
        acc.gross += breakdown.gross;
        acc.discount += breakdown.discount;
        acc.bankComm += breakdown.bankComm;
        acc.net += breakdown.net;
        acc.records += 1;
        return acc;
    }, { gross: 0, discount: 0, bankComm: 0, net: 0, records: 0 })
);

/**
 * Main financial distribution logic
 */
export const calculateFinancialResults = (inputs = {}, applyMariamDiscount = false, globalSettings = {}) => {
    const partners = globalSettings?.partners || [];
    
    // We'll calculate totals by summing values from inputs.
    // We prioritize inputs[partner.id], but if not present, we use inputs.abdulalem/brothers as fallbacks.
    let totalA = 0;
    let totalB = 0;
    let hasNamedA = false;
    let hasNamedB = false;

    partners.forEach(partner => {
      if (partner.isExcluded) return;

      const idAmount = toNumber(inputs[partner.id]);
      if (idAmount > 0) {
        if (partner.type === 'group') totalB += idAmount;
        else totalA += idAmount;
      } else {
        // Fallback to named keys if ID key is 0/missing
        if (partner.type === 'group' && !hasNamedB) {
          totalB += toNumber(inputs.brothers);
          hasNamedB = true;
        } else if (partner.type === 'individual' && !hasNamedA) {
          totalA += toNumber(inputs.abdulalem);
          hasNamedA = true;
        }
      }
    });

    // Final fallback: if no partners matched or processed, but we have named inputs
    if (totalA === 0) totalA = toNumber(inputs.abdulalem);
    if (totalB === 0) totalB = toNumber(inputs.brothers);

    const {
      partyADiscountRate,
      partyBDiscountRate,
      bankCommissionRate,
      partyCFixedAmount,
    } = getFinancialRates(globalSettings);

    // 1. Deduct Percentages (Distribution Pool)
    const discA = totalA * partyADiscountRate;
    const discB = totalB * partyBDiscountRate;
    
    const remainingA = totalA - discA;
    const remainingB = totalB - discB;
    
    const totalPool = discA + discB;
    
    let mariamShare = 0;
    let poolAfterMariam = totalPool;
    if (applyMariamDiscount) {
      mariamShare = partyCFixedAmount;
      poolAfterMariam = totalPool - partyCFixedAmount;
    }
    
    // Split the remaining pool 50/50
    const halfDistribution = poolAfterMariam / 2;
    
    // 2. Calculate Commission on remaining amounts (Post-discount)
    const commA = remainingA * bankCommissionRate;
    const commB = remainingB * bankCommissionRate;
    
    // Final balances
    const finalA = (remainingA + halfDistribution) - commA;
    const finalB = remainingB - commB;
    
    return {
      discA: roundCurrency(discA),
      discB: roundCurrency(discB),
      totalPool: roundCurrency(totalPool),
      mariamShare: roundCurrency(mariamShare),
      poolAfterMariam: roundCurrency(poolAfterMariam),
      halfDistribution: roundCurrency(halfDistribution),
      commA: roundCurrency(commA),
      commB: roundCurrency(commB),
      finalA: roundCurrency(finalA),
      finalB: roundCurrency(finalB),
      finalAsim: roundCurrency(halfDistribution),
      totalToTransfer: roundCurrency(finalA + finalB),
      totalInitial: roundCurrency(totalA + totalB)
    };
};

/**
 * Bank reconciliation logic
 */
export const calculateReconciliation = (reconciliation = {}) => {
    const bank = toNumber(reconciliation?.bankBalance);
    const sales = toNumber(reconciliation?.storeSales);
    const bTrans = toNumber(reconciliation?.brothersTransfers);
    const aTrans = toNumber(reconciliation?.abdulalemTransfers);
    const wTrans = toNumber(reconciliation?.womenTransfers);
    
    const expectedTotal = roundCurrency(sales + bTrans + aTrans + wTrans);
    const difference = roundCurrency(bank - expectedTotal);
    const tolerance = 0.01;
    
    let status = 'balanced';
    if (difference > tolerance) status = 'surplus';
    else if (difference < -tolerance) status = 'deficit';
    
    return { 
        expectedTotal, 
        difference, 
        status 
    };
};

/**
 * Individual account calculation
 */
export const calculateIndividual = (individualInput, globalSettings) => {
    const { partyBDiscountRate, bankCommissionRate } = getFinancialRates(globalSettings);
    const amount = toNumber(individualInput);
    const disc = amount * partyBDiscountRate;
    const remaining = amount - disc;
    const comm = remaining * bankCommissionRate;
    return {
        amount: roundCurrency(amount),
        disc: roundCurrency(disc),
        comm: roundCurrency(comm),
        net: roundCurrency(remaining - comm),
    };
};

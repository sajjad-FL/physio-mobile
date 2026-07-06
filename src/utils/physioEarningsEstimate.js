export const DEFAULT_ESTIMATOR_SESSION_FEE = 500

export const ESTIMATOR_MONTHLY_SESSION_OPTIONS = [50, 100, 150, 200, 250]

export function resolveEstimatorSessionFee(sessionFee) {
  const fee = Number(sessionFee)
  return Number.isFinite(fee) && fee > 0 ? fee : DEFAULT_ESTIMATOR_SESSION_FEE
}

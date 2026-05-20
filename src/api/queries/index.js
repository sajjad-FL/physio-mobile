import { useQuery } from '@tanstack/react-query'
import { api } from '../client'

function listData(res) {
  return res?.data?.data || []
}

export function useMyBookings(params = { page: 1, limit: 100 }, opts = {}) {
  return useQuery({
    queryKey: ['myBookings', params],
    queryFn: async () => listData(await api.get('/bookings/my', { params })),
    ...opts,
  })
}

export function useMyDisputes(params = { page: 1, limit: 8 }, opts = {}) {
  return useQuery({
    queryKey: ['myDisputes', params],
    queryFn: async () => {
      const res = await api.get('/disputes/my', { params })
      return { rows: listData(res), totalPages: Math.max(1, Number(res.data?.totalPages) || 1) }
    },
    ...opts,
  })
}

export function useProfile(opts = {}) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/profile')).data || {},
    ...opts,
  })
}

export function usePhysioBookings(params = { page: 1, limit: 100 }, opts = {}) {
  return useQuery({
    queryKey: ['physioBookings', params],
    queryFn: async () => listData(await api.get('/physio/bookings', { params })),
    ...opts,
  })
}

export function usePhysioDisputes(params = { page: 1, limit: 100 }, opts = {}) {
  return useQuery({
    queryKey: ['physioDisputes', params],
    queryFn: async () => {
      const res = await api.get('/disputes/my', { params })
      return { rows: listData(res), totalPages: Math.max(1, Number(res.data?.totalPages) || 1) }
    },
    ...opts,
  })
}

export function usePhysioMe(opts = {}) {
  return useQuery({
    queryKey: ['physioMe'],
    queryFn: async () => (await api.get('/physio/me')).data || {},
    ...opts,
  })
}

export const DEFAULT_REFERRAL_REWARD_AMOUNT = 300
export const DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT = 100

export function useReferralMyCode(opts = {}) {
  return useQuery({
    queryKey: ['referralMyCode'],
    queryFn: async () => {
      const res = await api.get('/referral/my-code')
      const amt = Number(res.data?.referralRewardAmount)
      const bonus = Number(res.data?.referralSignupBonusAmount)
      return {
        referralCode: res.data?.referralCode || '',
        walletBalance: Number(res.data?.walletBalance) || 0,
        referralRewardAmount:
          Number.isFinite(amt) && amt > 0 ? Math.round(amt) : DEFAULT_REFERRAL_REWARD_AMOUNT,
        referralSignupBonusAmount:
          Number.isFinite(bonus) && bonus >= 0
            ? Math.round(bonus)
            : DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT,
      }
    },
    ...opts,
  })
}

export function useReferralPublicSettings(opts = {}) {
  return useQuery({
    queryKey: ['referralPublicSettings'],
    queryFn: async () => {
      const res = await api.get('/referral/public-settings')
      const reward = Number(res.data?.referralRewardAmount)
      const bonus = Number(res.data?.referralSignupBonusAmount)
      return {
        referralRewardAmount:
          Number.isFinite(reward) && reward > 0 ? Math.round(reward) : DEFAULT_REFERRAL_REWARD_AMOUNT,
        referralSignupBonusAmount:
          Number.isFinite(bonus) && bonus >= 0
            ? Math.round(bonus)
            : DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT,
      }
    },
    staleTime: 60_000,
    ...opts,
  })
}

export function useReferralStats(opts = {}) {
  return useQuery({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const res = await api.get('/referral/stats')
      return Array.isArray(res.data?.referrals) ? res.data.referrals : []
    },
    ...opts,
  })
}

export function useBookingDetail(id, opts = {}) {
  return useQuery({
    queryKey: ['bookingDetail', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/bookings/${id}`)).data || {},
    ...opts,
  })
}

export function usePhysioBookingDetail(id, opts = {}) {
  return useQuery({
    queryKey: ['physioBookingDetail', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/physio/bookings/${id}`)).data || {},
    ...opts,
  })
}

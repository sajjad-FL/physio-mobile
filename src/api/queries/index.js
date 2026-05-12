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

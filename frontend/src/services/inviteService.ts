import { api } from './api'

export type InviteRequest = {
  email: string
  companyId: number
}

export type InviteValidateResponse = {
  email: string
  companyId: number
}

export const inviteService = {
  sendInvite: async (data: InviteRequest): Promise<void> => {
    await api.post('/invites', data)
  },

  validateInvite: async (token: string): Promise<InviteValidateResponse> => {
    const res = await api.get<InviteValidateResponse>('/invites/accept', { params: { token } })
    return res.data
  },

  acceptInvite: async (token: string, name: string, password: string): Promise<void> => {
    await api.post('/invites/accept', { token, name, password })
  },
}


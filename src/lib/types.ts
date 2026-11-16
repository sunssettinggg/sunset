export type ChatKind = 'direct' | 'group' | 'channel' | 'saved'
export type Role = 'owner' | 'admin' | 'member'

export interface Profile {
  verified?: boolean
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
  showcase_number: string | null
  handles: string[]
  channel_id: string | null
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  body: string | null
  reply_to: string | null
  created_at: string
  edited_at: string | null
  forwarded_from: string | null
  attachment_path: string | null
  attachment_type: 'image' | 'file' | 'voice' | null
}

export interface Reaction {
  message_id: string
  user_id: string
  emoji: string
}

export interface LastMessage {
  body: string | null
  created_at: string
  sender_id: string
  attachment_type?: 'image' | 'file' | 'voice' | null
}

export interface ChatItem {
  verified?: boolean
  id: string
  kind: ChatKind
  role: Role
  name: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  otherId: string | null
  joinedAt: string | null
  number: string | null
  handles: string[]
  description: string | null
  isPublic: boolean
  publicHandle: string | null
}

export interface PublicChat {
  id: string
  kind: 'group' | 'channel'
  title: string
  description: string | null
  handle: string | null
  avatar_url: string | null
  members: number
  joined: boolean
}

export interface ProfileChannel {
  id: string
  title: string
  is_public: boolean
  members: number
  joined: boolean
}

export interface Member {
  user_id: string
  role: Role
  display_name: string
  username: string
  avatar_url: string | null
}

export interface MarketItem {
  id: string
  kind: 'number' | 'username'
  value: string
  owner_id: string | null
  price: number | null
}

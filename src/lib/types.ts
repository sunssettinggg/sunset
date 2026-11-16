export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
  showcase_number: string | null
  handles: string[]
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
}

export interface ChatItem {
  id: string
  kind: 'direct' | 'group' | 'saved'
  name: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  otherId: string | null
  joinedAt: string | null
  number: string | null
  handles: string[]
}

export interface MarketItem {
  id: string
  kind: 'number' | 'username'
  value: string
  owner_id: string | null
  price: number | null
}

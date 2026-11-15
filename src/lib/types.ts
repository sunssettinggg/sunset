export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  body: string | null
  reply_to: string | null
  created_at: string
}

export interface Reaction {
  message_id: string
  user_id: string
  emoji: string
}

export interface ChatItem {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  otherId: string | null
}

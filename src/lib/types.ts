export interface Profile {
  id: string
  username: string
  display_name: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  body: string | null
  created_at: string
}

export interface ChatItem {
  id: string
  name: string
  username: string | null
}

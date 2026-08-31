export type Employee = {
  id: string
  full_name: string
  organization: string
  access_date: string
  record_type: 'person' | 'vehicle'
  vehicle_type: string | null
  created_at?: string
}

export type Meme = {
  id: string
  description: string
  image_url: string | null
  created_at?: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ReviewCycleStatus = 'draft' | 'active' | 'closed' | 'results_published'
export type RelationshipType = 'self' | 'peer' | 'direct_report' | 'manager'
export type UserRole = 'admin' | 'user'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          created_at?: string
        }
      }
      review_cycles: {
        Row: {
          id: string
          title: string
          status: ReviewCycleStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          status?: ReviewCycleStatus
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          status?: ReviewCycleStatus
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          review_cycle_id: string
          question_text: string
          question_order: number
          is_open_ended: boolean
          is_rating: boolean
          created_at: string
        }
        Insert: {
          id?: string
          review_cycle_id: string
          question_text: string
          question_order: number
          is_open_ended?: boolean
          is_rating?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          review_cycle_id?: string
          question_text?: string
          question_order?: number
          is_open_ended?: boolean
          is_rating?: boolean
          created_at?: string
        }
      }
      review_assignments: {
        Row: {
          id: string
          review_cycle_id: string
          reviewer_email: string
          subject_email: string
          relationship: RelationshipType
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          review_cycle_id: string
          reviewer_email: string
          subject_email: string
          relationship: RelationshipType
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          review_cycle_id?: string
          reviewer_email?: string
          subject_email?: string
          relationship?: RelationshipType
          completed_at?: string | null
          created_at?: string
        }
      }
      people: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string
          last_name?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          created_at?: string
        }
      }
      responses: {
        Row: {
          id: string
          assignment_id: string
          question_id: string
          open_text: string | null
          rating_value: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          question_id: string
          open_text?: string | null
          rating_value?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          question_id?: string
          open_text?: string | null
          rating_value?: number | null
          updated_at?: string
        }
      }
    }
    Enums: {
      review_cycle_status: ReviewCycleStatus
      relationship_type: RelationshipType
      user_role: UserRole
    }
  }
}

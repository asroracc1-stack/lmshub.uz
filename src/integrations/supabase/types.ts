export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          marked_by: string | null
          note: string | null
          organization_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          marked_by?: string | null
          note?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          marked_by?: string | null
          note?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_username: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_username?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_username?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          joined_at: string
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          is_group: boolean
          organization_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          is_group?: boolean
          organization_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          is_group?: boolean
          organization_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          awarded_by: string | null
          created_at: string
          id: string
          meta: Json | null
          organization_id: string
          reason: string
          source: string
          student_id: string
        }
        Insert: {
          amount: number
          awarded_by?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          organization_id: string
          reason: string
          source?: string
          student_id: string
        }
        Update: {
          amount?: number
          awarded_by?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          organization_id?: string
          reason?: string
          source?: string
          student_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          location: string | null
          organization_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          location?: string | null
          organization_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          location?: string | null
          organization_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          body: string | null
          created_at: string
          id: string
          organization_id: string
          student_id: string
          teacher_id: string
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id: string
          student_id: string
          teacher_id: string
          title: string
          type?: Database["public"]["Enums"]["feedback_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          student_id?: string
          teacher_id?: string
          title?: string
          type?: Database["public"]["Enums"]["feedback_type"]
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lesson_id: string | null
          max_score: number
          organization_id: string
          score: number
          student_id: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          max_score?: number
          organization_id: string
          score: number
          student_id: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          max_score?: number
          organization_id?: string
          score?: number
          student_id?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          organization_id: string
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          organization_id: string
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          organization_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_teachers: {
        Row: {
          assigned_at: string
          group_id: string
          id: string
          organization_id: string
          subject_id: string | null
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          group_id: string
          id?: string
          organization_id: string
          subject_id?: string | null
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          group_id?: string
          id?: string
          organization_id?: string
          subject_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_teachers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_teachers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          organization_id: string
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          organization_id: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          organization_id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          group_id: string
          id: string
          is_canceled: boolean
          organization_id: string
          room: string | null
          starts_at: string
          subject_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          group_id: string
          id?: string
          is_canceled?: boolean
          organization_id: string
          room?: string | null
          starts_at: string
          subject_id: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          group_id?: string
          id?: string
          is_canceled?: boolean
          organization_id?: string
          room?: string | null
          starts_at?: string
          subject_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_broadcast: boolean
          organization_id: string | null
          parent_id: string | null
          recipient_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          organization_id?: string | null
          parent_id?: string | null
          recipient_id?: string | null
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          organization_id?: string | null
          parent_id?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_answers: {
        Row: {
          answer: string | null
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string | null
          time_spent_ms: number
        }
        Insert: {
          answer?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
          time_spent_ms?: number
        }
        Update: {
          answer?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
          time_spent_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_attempts: {
        Row: {
          ai_feedback: string | null
          band_score: number | null
          finished_at: string | null
          id: string
          max_score: number | null
          organization_id: string | null
          raw_score: number | null
          started_at: string
          status: string
          student_id: string
          test_id: string
        }
        Insert: {
          ai_feedback?: string | null
          band_score?: number | null
          finished_at?: string | null
          id?: string
          max_score?: number | null
          organization_id?: string | null
          raw_score?: number | null
          started_at?: string
          status?: string
          student_id: string
          test_id: string
        }
        Update: {
          ai_feedback?: string | null
          band_score?: number | null
          finished_at?: string | null
          id?: string
          max_score?: number | null
          organization_id?: string | null
          raw_score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_questions: {
        Row: {
          correct_answer: string | null
          explanation: string | null
          id: string
          options: Json | null
          points: number
          position: number
          prompt: string
          qtype: string
          section_index: number
          test_id: string
        }
        Insert: {
          correct_answer?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number
          position?: number
          prompt: string
          qtype?: string
          section_index?: number
          test_id: string
        }
        Update: {
          correct_answer?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number
          position?: number
          prompt?: string
          qtype?: string
          section_index?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          audio_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          duration_minutes: number
          id: string
          is_published: boolean
          kind: Database["public"]["Enums"]["mock_kind"]
          organization_id: string | null
          part_type: string
          passage: string | null
          required_pack: string
          sections: Json
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          is_published?: boolean
          kind: Database["public"]["Enums"]["mock_kind"]
          organization_id?: string | null
          part_type?: string
          passage?: string | null
          required_pack?: string
          sections?: Json
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          is_published?: boolean
          kind?: Database["public"]["Enums"]["mock_kind"]
          organization_id?: string | null
          part_type?: string
          passage?: string | null
          required_pack?: string
          sections?: Json
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          parent_id: string
          relation: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          parent_id: string
          relation?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          parent_id?: string
          relation?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_managers: {
        Row: {
          approved_count: number
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          is_default: boolean
          last_active_at: string | null
          last_assigned_at: string | null
          rejected_count: number
          telegram_chat_id: string
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_active_at?: string | null
          last_assigned_at?: string | null
          rejected_count?: number
          telegram_chat_id: string
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_active_at?: string | null
          last_assigned_at?: string | null
          rejected_count?: number
          telegram_chat_id?: string
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_receivers: {
        Row: {
          card_holder: string
          card_number: string
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          is_active: boolean
          is_default: boolean
          organization_id: string | null
          payment_purpose: string
          role_type: string
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_holder: string
          card_number: string
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          organization_id?: string | null
          payment_purpose?: string
          role_type?: string
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_holder?: string
          card_number?: string
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          organization_id?: string | null
          payment_purpose?: string
          role_type?: string
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          assigned_manager_id: string | null
          billing_period: string | null
          click_paydoc_id: number | null
          click_trans_id: number | null
          created_at: string
          currency: string
          error_code: number | null
          error_note: string | null
          id: string
          invoice_id: string | null
          manager_comment: string | null
          merchant_trans_id: string | null
          note: string | null
          organization_id: string | null
          pack_id: string | null
          payment_type: string
          performed_at: string | null
          provider: string
          provider_transaction_id: string | null
          receipt_url: string | null
          receiver_id: string | null
          recipient_id: string | null
          recipient_role: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          subscription_id: string | null
          telegram_sent_at: string | null
          transaction_ref: string | null
          updated_at: string
          user_comment: string | null
        }
        Insert: {
          amount: number
          assigned_manager_id?: string | null
          billing_period?: string | null
          click_paydoc_id?: number | null
          click_trans_id?: number | null
          created_at?: string
          currency?: string
          error_code?: number | null
          error_note?: string | null
          id?: string
          invoice_id?: string | null
          manager_comment?: string | null
          merchant_trans_id?: string | null
          note?: string | null
          organization_id?: string | null
          pack_id?: string | null
          payment_type?: string
          performed_at?: string | null
          provider?: string
          provider_transaction_id?: string | null
          receipt_url?: string | null
          receiver_id?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          subscription_id?: string | null
          telegram_sent_at?: string | null
          transaction_ref?: string | null
          updated_at?: string
          user_comment?: string | null
        }
        Update: {
          amount?: number
          assigned_manager_id?: string | null
          billing_period?: string | null
          click_paydoc_id?: number | null
          click_trans_id?: number | null
          created_at?: string
          currency?: string
          error_code?: number | null
          error_note?: string | null
          id?: string
          invoice_id?: string | null
          manager_comment?: string | null
          merchant_trans_id?: string | null
          note?: string | null
          organization_id?: string | null
          pack_id?: string | null
          payment_type?: string
          performed_at?: string | null
          provider?: string
          provider_transaction_id?: string | null
          receipt_url?: string | null
          receiver_id?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          subscription_id?: string | null
          telegram_sent_at?: string | null
          transaction_ref?: string | null
          updated_at?: string
          user_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_assigned_manager_id_fkey"
            columns: ["assigned_manager_id"]
            isOneToOne: false
            referencedRelation: "payment_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "subscription_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "payment_receivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_profiles_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          activity: string
          created_at: string
          id: string
          meta: Json
          minutes: number
          user_id: string
        }
        Insert: {
          activity?: string
          created_at?: string
          id?: string
          meta?: Json
          minutes: number
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          meta?: Json
          minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          created_at: string
          cta_label: string
          cta_link: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_monthly: number
          price_suffix: string | null
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          cta_link?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_monthly?: number
          price_suffix?: string | null
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          cta_link?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_monthly?: number
          price_suffix?: string | null
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          email: string | null
          exam_date: string | null
          full_name: string | null
          id: string
          is_active: boolean
          organization_id: string | null
          payment_card_number: string | null
          payment_card_owner: string | null
          phone: string | null
          referral_bonus_paid: boolean
          referral_code: string | null
          referred_by: string | null
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          exam_date?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          organization_id?: string | null
          payment_card_number?: string | null
          payment_card_owner?: string | null
          phone?: string | null
          referral_bonus_paid?: boolean
          referral_code?: string | null
          referred_by?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          exam_date?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          payment_card_number?: string | null
          payment_card_owner?: string | null
          phone?: string | null
          referral_bonus_paid?: boolean
          referral_code?: string | null
          referred_by?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_grants: {
        Row: {
          coins_spent: number
          created_at: string
          description: string | null
          granted_by: string | null
          id: string
          organization_id: string
          reward_id: string | null
          status: string
          student_id: string
          title: string
        }
        Insert: {
          coins_spent?: number
          created_at?: string
          description?: string | null
          granted_by?: string | null
          id?: string
          organization_id: string
          reward_id?: string | null
          status?: string
          student_id: string
          title: string
        }
        Update: {
          coins_spent?: number
          created_at?: string
          description?: string | null
          granted_by?: string | null
          id?: string
          organization_id?: string
          reward_id?: string | null
          status?: string
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          cost_coins: number
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          organization_id: string
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          cost_coins?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          cost_coins?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          stock?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      speaking_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "speaking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_sessions: {
        Row: {
          created_at: string
          id: string
          language: string
          level: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          level?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          level?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_packs: {
        Row: {
          ai_grade_enabled: boolean
          code: string
          created_at: string
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          mock_limit: number | null
          name: string
          price_uzs: number
          sections: Json
          sort_order: number
          speaking_minutes: number | null
          updated_at: string
        }
        Insert: {
          ai_grade_enabled?: boolean
          code: string
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          mock_limit?: number | null
          name: string
          price_uzs?: number
          sections?: Json
          sort_order?: number
          speaking_minutes?: number | null
          updated_at?: string
        }
        Update: {
          ai_grade_enabled?: boolean
          code?: string
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          mock_limit?: number | null
          name?: string
          price_uzs?: number
          sections?: Json
          sort_order?: number
          speaking_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          bot_token: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          updated_at: string
          username: string
        }
        Insert: {
          bot_token?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name?: string
          updated_at?: string
          username: string
        }
        Update: {
          bot_token?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          compact_mode: boolean
          email_notifications: boolean
          language: string
          push_notifications: boolean
          telegram_notifications: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_mode?: boolean
          email_notifications?: boolean
          language?: string
          push_notifications?: boolean
          telegram_notifications?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_mode?: boolean
          email_notifications?: boolean
          language?: string
          push_notifications?: boolean
          telegram_notifications?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          pack_id: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          pack_id: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          pack_id?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "subscription_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      telegram_links_public: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          kind: string | null
          name: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          kind?: string | null
          name?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          kind?: string | null
          name?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_subscription: { Args: { _sub_id: string }; Returns: undefined }
      apply_referral: { Args: { _code: string }; Returns: boolean }
      approve_org_payment: {
        Args: { _comment?: string; _payment_id: string }
        Returns: undefined
      }
      approve_payment: {
        Args: { _comment?: string; _payment_id: string }
        Returns: undefined
      }
      award_coins: {
        Args: {
          _amount: number
          _meta?: Json
          _reason: string
          _source?: string
          _student_id: string
        }
        Returns: string
      }
      claim_reward: { Args: { _reward_id: string }; Returns: string }
      current_user_org: { Args: never; Returns: string }
      get_leaderboard: {
        Args: {
          _limit?: number
          _organization_id?: string
          _period?: string
          _role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          avatar_url: string
          full_name: string
          organization_id: string
          rank: number
          total_coins: number
          user_id: string
          username: string
        }[]
      }
      get_practice_leaderboard: {
        Args: { _limit?: number; _period?: string }
        Returns: {
          avatar_url: string
          full_name: string
          rank: number
          total_minutes: number
          user_id: string
          username: string
        }[]
      }
      get_user_pack: { Args: { _user_id: string }; Returns: string }
      grant_coins_to_user: {
        Args: { _amount: number; _reason?: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_teacher: { Args: { _group_id: string }; Returns: boolean }
      is_org_manager: { Args: { _org_id: string }; Returns: boolean }
      is_thread_participant: { Args: { _thread_id: string }; Returns: boolean }
      kind_to_section: { Args: { _kind: string }; Returns: string }
      log_practice: {
        Args: { _activity?: string; _meta?: Json; _minutes: number }
        Returns: string
      }
      maybe_pay_referral_bonus: {
        Args: { _user_id: string }
        Returns: undefined
      }
      next_payment_manager: {
        Args: never
        Returns: {
          display_name: string
          id: string
          telegram_chat_id: string
          telegram_username: string
          user_id: string
        }[]
      }
      reject_org_payment: {
        Args: { _payment_id: string; _reason?: string }
        Returns: undefined
      }
      reject_payment: {
        Args: { _payment_id: string; _reason?: string }
        Returns: undefined
      }
      reject_subscription: { Args: { _sub_id: string }; Returns: undefined }
      send_exam_countdown_reminders: { Args: never; Returns: undefined }
      send_notification: {
        Args: {
          _body?: string
          _link?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      subscribe_to_pack: { Args: { _pack_id: string }; Returns: string }
      user_has_section: {
        Args: { _section: string; _user_id: string }
        Returns: boolean
      }
      user_section_access: {
        Args: { _user_id: string }
        Returns: {
          expires_at: string
          ielts: boolean
          milliy: boolean
          pack_code: string
          sat: boolean
        }[]
      }
      write_audit: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _meta?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "administrator"
        | "teacher"
        | "student"
        | "parent"
        | "payment_manager"
        | "user"
      attendance_status: "present" | "absent" | "late" | "excused"
      feedback_type: "positive" | "negative" | "neutral"
      mock_kind:
        | "reading"
        | "listening"
        | "writing"
        | "speaking"
        | "sat"
        | "national_cert"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "administrator",
        "teacher",
        "student",
        "parent",
        "payment_manager",
        "user",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      feedback_type: ["positive", "negative", "neutral"],
      mock_kind: [
        "reading",
        "listening",
        "writing",
        "speaking",
        "sat",
        "national_cert",
      ],
    },
  },
} as const

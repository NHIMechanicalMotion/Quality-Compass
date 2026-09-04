export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      china_approvals: {
        Row: {
          approval_date: string | null
          created_at: string | null
          decision: string | null
          decision_notes: string | null
          drawing_id: string
          facility_location: string | null
          id: string
          inspection_date: string | null
          inspector_name: string | null
          inspector_name_zh: string | null
          qa_manager_name: string | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          created_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          drawing_id: string
          facility_location?: string | null
          id: string
          inspection_date?: string | null
          inspector_name?: string | null
          inspector_name_zh?: string | null
          qa_manager_name?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          created_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          drawing_id?: string
          facility_location?: string | null
          id?: string
          inspection_date?: string | null
          inspector_name?: string | null
          inspector_name_zh?: string | null
          qa_manager_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "china_approvals_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_balloons: {
        Row: {
          balloon_color: string | null
          classification: string
          created_at: string | null
          dimension_name: string
          dimension_name_zh: string | null
          dimension_type: string
          drawing_id: string
          drawing_zone: string | null
          gdt_datums: string[] | null
          gdt_symbol: string | null
          gdt_tolerance: string | null
          id: string
          item_number: number
          leader_x: number | null
          leader_y: number | null
          lower_tol: number
          max_limit: number
          min_limit: number
          nominal: number
          pos_x: number
          pos_y: number
          raw_callout: string
          sheet_number: number | null
          unit: string
          updated_at: string | null
          upper_tol: number
        }
        Insert: {
          balloon_color?: string | null
          classification?: string
          created_at?: string | null
          dimension_name: string
          dimension_name_zh?: string | null
          dimension_type: string
          drawing_id: string
          drawing_zone?: string | null
          gdt_datums?: string[] | null
          gdt_symbol?: string | null
          gdt_tolerance?: string | null
          id: string
          item_number: number
          leader_x?: number | null
          leader_y?: number | null
          lower_tol?: number
          max_limit: number
          min_limit: number
          nominal: number
          pos_x: number
          pos_y: number
          raw_callout: string
          sheet_number?: number | null
          unit?: string
          updated_at?: string | null
          upper_tol?: number
        }
        Update: {
          balloon_color?: string | null
          classification?: string
          created_at?: string | null
          dimension_name?: string
          dimension_name_zh?: string | null
          dimension_type?: string
          drawing_id?: string
          drawing_zone?: string | null
          gdt_datums?: string[] | null
          gdt_symbol?: string | null
          gdt_tolerance?: string | null
          id?: string
          item_number?: number
          leader_x?: number | null
          leader_y?: number | null
          lower_tol?: number
          max_limit?: number
          min_limit?: number
          nominal?: number
          pos_x?: number
          pos_y?: number
          raw_callout?: string
          sheet_number?: number | null
          unit?: string
          updated_at?: string | null
          upper_tol?: number
        }
        Relationships: [
          {
            foreignKeyName: "dimension_balloons_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          approved_by: string | null
          audit_status: string | null
          checked_by: string | null
          compliance_score: number | null
          created_at: string | null
          drawing_number: string
          drawn_by: string | null
          finish: string | null
          general_tolerance_note: string | null
          id: string
          material: string | null
          organization: string | null
          part_name: string
          projection: string | null
          release_date: string | null
          revision: string
          scale: string | null
          sheet: string | null
          units: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          audit_status?: string | null
          checked_by?: string | null
          compliance_score?: number | null
          created_at?: string | null
          drawing_number: string
          drawn_by?: string | null
          finish?: string | null
          general_tolerance_note?: string | null
          id: string
          material?: string | null
          organization?: string | null
          part_name: string
          projection?: string | null
          release_date?: string | null
          revision: string
          scale?: string | null
          sheet?: string | null
          units?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          audit_status?: string | null
          checked_by?: string | null
          compliance_score?: number | null
          created_at?: string | null
          drawing_number?: string
          drawn_by?: string | null
          finish?: string | null
          general_tolerance_note?: string | null
          id?: string
          material?: string | null
          organization?: string | null
          part_name?: string
          projection?: string | null
          release_date?: string | null
          revision?: string
          scale?: string | null
          sheet?: string | null
          units?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inspection_control_items: {
        Row: {
          balloon_id: string
          created_at: string | null
          deviation_notes: string | null
          drawing_id: string
          id: string
          item_number: number
          recommended_tool_en: string | null
          recommended_tool_zh: string | null
          sample1: number | null
          sample2: number | null
          sample3: number | null
          sample4: number | null
          sample5: number | null
          sampling_plan_en: string | null
          sampling_plan_zh: string | null
          selected_tool_en: string | null
          selected_tool_zh: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          balloon_id: string
          created_at?: string | null
          deviation_notes?: string | null
          drawing_id: string
          id: string
          item_number: number
          recommended_tool_en?: string | null
          recommended_tool_zh?: string | null
          sample1?: number | null
          sample2?: number | null
          sample3?: number | null
          sample4?: number | null
          sample5?: number | null
          sampling_plan_en?: string | null
          sampling_plan_zh?: string | null
          selected_tool_en?: string | null
          selected_tool_zh?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          balloon_id?: string
          created_at?: string | null
          deviation_notes?: string | null
          drawing_id?: string
          id?: string
          item_number?: number
          recommended_tool_en?: string | null
          recommended_tool_zh?: string | null
          sample1?: number | null
          sample2?: number | null
          sample3?: number | null
          sample4?: number | null
          sample5?: number | null
          sampling_plan_en?: string | null
          sampling_plan_zh?: string | null
          selected_tool_en?: string | null
          selected_tool_zh?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_control_items_balloon_id_fkey"
            columns: ["balloon_id"]
            isOneToOne: false
            referencedRelation: "dimension_balloons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_control_items_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
  }
}

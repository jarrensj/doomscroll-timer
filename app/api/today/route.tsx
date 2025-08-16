import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    const { data, error } = await supabase
      .from('date_entries')
      .select('total_time_ms')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching daily time:', error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({
      date: today,
      total_time_ms: data?.total_time_ms || 0
    })
  } catch (error) {
    console.error('Error in today route:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { additional_time_ms } = await request.json()
    
    if (typeof additional_time_ms !== 'number' || additional_time_ms < 0) {
      return NextResponse.json({ error: "Invalid additional_time_ms" }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // First, try to get existing record
    const { data: existingData, error: fetchError } = await supabase
      .from('date_entries')
      .select('total_time_ms')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    let newTotal = additional_time_ms;
    if (!fetchError && existingData) {
      // If record exists, add to existing total
      newTotal = existingData.total_time_ms + additional_time_ms;
    }

    // Use upsert to either create or update the daily record
    const { data, error } = await supabase
      .from('date_entries')
      .upsert({
        user_id: userId,
        date: today,
        total_time_ms: newTotal
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      })
      .select('total_time_ms')
      .single()

    if (error) {
      // If it's a conflict, we need to increment the existing value
      if (error.code === '23505') {
        const { data: currentData, error: fetchError } = await supabase
          .from('date_entries')
          .select('total_time_ms')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (fetchError) {
          console.error('Error fetching current time:', fetchError)
          return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        const newTotal = (currentData?.total_time_ms || 0) + additional_time_ms

        const { data: updatedData, error: updateError } = await supabase
          .from('date_entries')
          .update({ total_time_ms: newTotal })
          .eq('user_id', userId)
          .eq('date', today)
          .select('total_time_ms')
          .single()

        if (updateError) {
          console.error('Error updating daily time:', updateError)
          return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        return NextResponse.json({
          date: today,
          total_time_ms: updatedData.total_time_ms
        })
      }
      
      console.error('Error upserting daily time:', error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({
      date: today,
      total_time_ms: data.total_time_ms
    })
  } catch (error) {
    console.error('Error in today POST route:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
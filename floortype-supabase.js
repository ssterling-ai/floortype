// ============================================================
// floortype-supabase.js
// ============================================================
// Drop this file in your project root.
// Import it into any page that needs live data.
//
// Usage in any HTML file:
//   <script type="module">
//     import { db } from './floortype-supabase.js'
//     const orders = await db.orders.getAll()
//   </script>
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CONFIG ───────────────────────────────────────────────────
// These come from your .env.local file (Vercel injects them).
// For local dev, replace with your actual values from:
//   Supabase Dashboard → Project Settings → API

const SUPABASE_URL  = import.meta.env?.VITE_SUPABASE_URL  || window.SUPABASE_URL
const SUPABASE_KEY  = import.meta.env?.VITE_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Floortype] Supabase not configured — falling back to localStorage demo data.')
}

export const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null


// ============================================================
// AUTH
// Email magic-link auth for the client portal.
// ============================================================
export const auth = {

  // Send magic link to client email
  async sendMagicLink(email) {
    if (!supabase) return { error: 'Supabase not configured' }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/floortype-portal.html` }
    })
    return { error }
  },

  // Get currently logged-in user
  async getUser() {
    if (!supabase) return null
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Sign out
  async signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    if (!supabase) return
    supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null)
    })
  }
}


// ============================================================
// ORDERS
// ============================================================
export const ordersAPI = {

  // Get all orders (admin — uses service role, see admin.js)
  async getAll() {
    if (!supabase) return fallback.orders()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_files(*), revision_rounds(*, revision_files(*), revision_notes(*))')
      .order('created_at', { ascending: false })
    if (error) { console.error('[orders.getAll]', error); return [] }
    return data
  },

  // Get orders for current logged-in client
  async getMine() {
    if (!supabase) return fallback.orders()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_files(*), revision_rounds(*, revision_files(*), revision_notes(*))')
      .order('created_at', { ascending: false })
    if (error) { console.error('[orders.getMine]', error); return [] }
    return data
  },

  // Get single order by ref
  async getByRef(ref) {
    if (!supabase) return fallback.orderByRef(ref)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_files(*), revision_rounds(*, revision_files(*), revision_notes(*))')
      .eq('ref', ref)
      .single()
    if (error) { console.error('[orders.getByRef]', error); return null }
    return data
  },

  // Create a new order (called at checkout)
  async create(orderData) {
    if (!supabase) return fallback.createOrder(orderData)

    // 1. Upsert client record
    await supabase.from('clients').upsert({
      email:   orderData.client_email,
      name:    orderData.client_name,
      company: orderData.client_company,
      phone:   orderData.phone
    }, { onConflict: 'email' })

    // 2. Insert order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ref:            orderData.ref,
        client_name:    orderData.client_name,
        client_email:   orderData.client_email,
        client_company: orderData.client_company,
        address:        orderData.address,
        property_type:  orderData.property_type,
        floors:         orderData.floors,
        style:          orderData.style,
        addons:         orderData.addons,
        total:          orderData.total,
        deposit:        orderData.deposit,
        notes:          orderData.notes,
        stripe_payment_intent_id: orderData.stripe_payment_intent_id,
        status:         'Received'
      })
      .select()
      .single()

    if (error) { console.error('[orders.create]', error); return null }
    return data
  },

  // Update order status (admin)
  async updateStatus(ref, status) {
    if (!supabase) return fallback.updateOrderStatus(ref, status)
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('ref', ref)
    if (error) console.error('[orders.updateStatus]', error)
    return !error
  },

  // Upload a file for an order
  async uploadFile(orderId, orderRef, file) {
    if (!supabase) return null
    const path = `${orderRef}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('order-files')
      .upload(path, file)
    if (upErr) { console.error('[orders.uploadFile]', upErr); return null }

    const { error: dbErr } = await supabase.from('order_files').insert({
      order_id:     orderId,
      filename:     file.name,
      storage_path: path,
      file_size:    file.size,
      mime_type:    file.type
    })
    if (dbErr) console.error('[orders.uploadFile db]', dbErr)
    return path
  },

  // Get a signed URL for a file (48hr expiry)
  async getFileUrl(storagePath, bucket = 'order-files') {
    if (!supabase) return '#'
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 48)
    return data?.signedUrl ?? '#'
  },

  // Subscribe to new orders in real-time (admin dashboard)
  subscribeToNew(callback) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel('orders-insert')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        payload => callback(payload.new)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  // Subscribe to status changes on a specific order (client portal)
  subscribeToOrder(orderRef, callback) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel(`order-${orderRef}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `ref=eq.${orderRef}` },
        payload => callback(payload.new)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
}


// ============================================================
// REVISION ROUNDS & NOTES
// ============================================================
export const revisionsAPI = {

  // Create a new revision round (admin uploads a draft)
  async createRound(orderId, roundNumber) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('revision_rounds')
      .insert({ order_id: orderId, round_number: roundNumber, status: 'Pending', delivered_at: new Date().toISOString() })
      .select()
      .single()
    if (error) { console.error('[revisions.createRound]', error); return null }
    return data
  },

  // Upload a deliverable file to a round
  async uploadDeliverable(orderRef, roundId, file) {
    if (!supabase) return null
    const path = `${orderRef}/round-${roundId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('deliverables')
      .upload(path, file)
    if (upErr) { console.error('[revisions.uploadDeliverable]', upErr); return null }

    await supabase.from('revision_files').insert({
      round_id:     roundId,
      filename:     file.name,
      storage_path: path,
      file_size:    file.size,
      mime_type:    file.type
    })
    return path
  },

  // Add a note to a round (client or team)
  async addNote(roundId, orderId, authorType, authorName, body) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('revision_notes')
      .insert({ round_id: roundId, order_id: orderId, author_type: authorType, author_name: authorName, body })
      .select()
      .single()
    if (error) { console.error('[revisions.addNote]', error); return null }
    return data
  },

  // Approve a round (client)
  async approveRound(roundId, orderId) {
    if (!supabase) return false
    const { error: rErr } = await supabase
      .from('revision_rounds')
      .update({ status: 'Approved', approved_at: new Date().toISOString() })
      .eq('id', roundId)
    if (rErr) { console.error('[revisions.approveRound]', rErr); return false }

    // Check if all rounds done → mark order complete
    await supabase
      .from('orders')
      .update({ status: 'Complete' })
      .eq('id', orderId)

    return true
  },

  // Subscribe to new notes on an order (live chat feel)
  subscribeToNotes(orderId, callback) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel(`notes-${orderId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'revision_notes', filter: `order_id=eq.${orderId}` },
        payload => callback(payload.new)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
}


// ============================================================
// QUOTES
// ============================================================
export const quotesAPI = {

  // Get all quotes (admin)
  async getAll() {
    if (!supabase) return fallback.quotes()
    const { data, error } = await supabase
      .from('quotes')
      .select('*, quote_files(*)')
      .order('created_at', { ascending: false })
    if (error) { console.error('[quotes.getAll]', error); return [] }
    return data
  },

  // Submit a new quote request
  async create(quoteData) {
    if (!supabase) return fallback.createQuote(quoteData)

    // Upsert client
    await supabase.from('clients').upsert({
      email:   quoteData.client_email,
      name:    quoteData.client_name,
      company: quoteData.client_company,
      role:    quoteData.client_role
    }, { onConflict: 'email' })

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        ref:              quoteData.ref,
        client_name:      quoteData.client_name,
        client_email:     quoteData.client_email,
        client_company:   quoteData.client_company,
        client_role:      quoteData.client_role,
        project_name:     quoteData.project_name,
        project_type:     quoteData.project_type,
        city:             quoteData.city,
        country:          quoteData.country,
        phases:           quoteData.phases,
        phase_details:    quoteData.phase_details,
        description:      quoteData.description,
        renders:          quoteData.renders,
        complexity:       quoteData.complexity,
        sqft:             quoteData.sqft,
        deliverables:     quoteData.deliverables,
        timeline:         quoteData.timeline,
        target_date:      quoteData.target_date,
        deadline_reason:  quoteData.deadline_reason,
        estimate_low:     quoteData.estimate_low,
        estimate_high:    quoteData.estimate_high,
        notes:            quoteData.notes,
        status:           'Received'
      })
      .select()
      .single()

    if (error) { console.error('[quotes.create]', error); return null }
    return data
  },

  // Update status and/or confirmed quote figures (admin)
  async update(ref, updates) {
    if (!supabase) return fallback.updateQuote(ref, updates)
    const { error } = await supabase
      .from('quotes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('ref', ref)
    if (error) console.error('[quotes.update]', error)
    return !error
  },

  // Upload a reference file to a quote
  async uploadFile(quoteId, quoteRef, section, file) {
    if (!supabase) return null
    const path = `${quoteRef}/${section}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('quote-files')
      .upload(path, file)
    if (upErr) { console.error('[quotes.uploadFile]', upErr); return null }

    await supabase.from('quote_files').insert({
      quote_id:     quoteId,
      section,
      filename:     file.name,
      storage_path: path,
      file_size:    file.size,
      mime_type:    file.type
    })
    return path
  },

  // Subscribe to new quotes in real-time (admin)
  subscribeToNew(callback) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel('quotes-insert')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quotes' },
        payload => callback(payload.new)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
}


// ============================================================
// CLIENTS
// ============================================================
export const clientsAPI = {
  async getAll() {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('[clients.getAll]', error); return [] }
    return data
  }
}


// ============================================================
// CONVENIENCE EXPORT
// Single object for easy imports across pages.
// ============================================================
export const db = {
  auth,
  orders:    ordersAPI,
  revisions: revisionsAPI,
  quotes:    quotesAPI,
  clients:   clientsAPI
}


// ============================================================
// FALLBACK (localStorage — used when Supabase not configured)
// These mirror the demo data in the admin/portal dashboards.
// ============================================================
const fallback = {
  orders: ()    => JSON.parse(localStorage.getItem('ft_orders') || '[]'),
  quotes: ()    => JSON.parse(localStorage.getItem('ft_quotes') || '[]'),
  orderByRef:   (ref) => fallback.orders().find(o => o.ref === ref) || null,

  createOrder: (data) => {
    const orders = fallback.orders()
    orders.unshift(data)
    localStorage.setItem('ft_orders', JSON.stringify(orders))
    return data
  },
  createQuote: (data) => {
    const quotes = fallback.quotes()
    quotes.unshift(data)
    localStorage.setItem('ft_quotes', JSON.stringify(quotes))
    return data
  },
  updateOrderStatus: (ref, status) => {
    const orders = fallback.orders()
    const o = orders.find(x => x.ref === ref)
    if (o) { o.status = status; localStorage.setItem('ft_orders', JSON.stringify(orders)) }
    return !!o
  },
  updateQuote: (ref, updates) => {
    const quotes = fallback.quotes()
    const q = quotes.find(x => x.ref === ref)
    if (q) { Object.assign(q, updates); localStorage.setItem('ft_quotes', JSON.stringify(quotes)) }
    return !!q
  }
}

export default db

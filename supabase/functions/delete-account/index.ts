// delete-account — authenticated Edge Function behind supabase.functions.invoke.
//
// Anonymises the caller's own account rather than deleting its rows. A
// marketplace cannot erase orders and payments on request: they are financial
// records with statutory retention periods, and the other side of a completed
// sale still needs their purchase history after the seller leaves. See
// supabase/round7-account-deletion.sql for the schema this relies on.
//
// Runs with the service-role key because banning a user and rewriting their
// auth email are admin operations that must never be reachable from a browser.
// The caller's identity comes from their own JWT, never from the request body,
// so this can only ever delete the account that invoked it.
//
// Deploy: supabase functions deploy delete-account
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/razorpay.ts'

// profiles.avatar_emoji, bio and city are NOT NULL, so they are blanked with an
// empty string rather than null.
const DELETED_NAME = 'Deleted user'

// Handle is unique and shown wherever a seller is credited. Deriving it from the
// user id keeps it collision-free without a lookup, and short enough for the
// 20-character handle limit.
function anonymisedHandle(uid: string): string {
  return `deleted_${uid.replace(/-/g, '').slice(0, 12)}`
}

// Kept in a real address space so the row stays valid for GoTrue's own
// constraints, but on a domain that can never receive mail.
function anonymisedEmail(uid: string): string {
  return `deleted+${uid}@deleted.spottedin.invalid`
}

async function anonymise(admin: SupabaseClient, uid: string): Promise<Response> {
  const { data: existing, error: readError } = await admin
    .from('profiles')
    .select('id,deleted_at')
    .eq('id', uid)
    .maybeSingle()

  if (readError) {
    console.error('delete-account: profile read failed', readError)
    return json(500, { error: 'internal' })
  }
  // No profile means onboarding never completed. The auth user still has to be
  // closed, so this is not an error — fall through with nothing to scrub.
  if (existing?.deleted_at) {
    return json(409, { error: 'already_deleted' })
  }

  if (existing) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        handle: anonymisedHandle(uid),
        name: DELETED_NAME,
        avatar_emoji: '',
        bio: '',
        city: '',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', uid)

    if (profileError) {
      console.error('delete-account: profile anonymise failed', profileError)
      return json(500, { error: 'internal' })
    }
  }

  // Withdraw anything still for sale. Sold listings are deliberately untouched:
  // they are the buyer's record of what they bought, and listings_select_live
  // already keeps non-live rows out of the public feed.
  const { error: listingError } = await admin
    .from('listings')
    .update({ status: 'removed' })
    .eq('seller_id', uid)
    .eq('status', 'live')

  if (listingError) {
    console.error('delete-account: listing withdrawal failed', listingError)
    return json(500, { error: 'internal' })
  }

  // Last, because it is the step that ends the session. Doing it earlier would
  // risk leaving a signed-out user with an un-scrubbed profile if a later step
  // failed.
  const { error: authError } = await admin.auth.admin.updateUserById(uid, {
    email: anonymisedEmail(uid),
    ban_duration: '876000h', // ~100 years; GoTrue has no permanent-ban value
    user_metadata: {},
  })

  if (authError) {
    console.error('delete-account: auth anonymise failed', authError)
    return json(500, { error: 'internal' })
  }

  return json(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await authed.auth.getUser()
  const uid = userData?.user?.id
  if (!uid) return json(401, { error: 'unauthorized' })

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  try {
    return await anonymise(admin, uid)
  } catch (err) {
    console.error('delete-account error', err)
    return json(500, { error: 'internal' })
  }
})

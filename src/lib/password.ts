// Password policy, kept in one place so the signup form and any future
// change-password screen cannot drift apart.
//
// This mirrors what Supabase enforces server-side (Auth settings → password
// requirements). The server is the real control — anything here is only a
// courtesy so people find out before submitting rather than after. If the two
// disagree, the server wins and the visitor sees a raw API error, so these must
// be changed together.
//
// Depop is no guide here: they moved to magic links and publish no password
// rules. This follows the common floor instead, which also supports the
// "reasonable security safeguards" expected of personal data under India's
// DPDP Act.

export const PASSWORD_MIN_LENGTH = 8

// Kept broad on purpose. A narrow list rejects perfectly good passwords from
// password managers, and every character here is one Supabase counts as a
// symbol.
const SPECIAL_CHARACTERS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/

export type PasswordProblem =
  | 'too_short'
  | 'needs_lowercase'
  | 'needs_uppercase'
  | 'needs_digit'
  | 'needs_special'

// Returns every unmet requirement rather than the first, so the message can tell
// someone everything they need to fix in one go.
export function passwordProblems(password: string): PasswordProblem[] {
  const problems: PasswordProblem[] = []
  if (password.length < PASSWORD_MIN_LENGTH) problems.push('too_short')
  if (!/[a-z]/.test(password)) problems.push('needs_lowercase')
  if (!/[A-Z]/.test(password)) problems.push('needs_uppercase')
  if (!/[0-9]/.test(password)) problems.push('needs_digit')
  if (!SPECIAL_CHARACTERS.test(password)) problems.push('needs_special')
  return problems
}

const LABELS: Record<PasswordProblem, string> = {
  too_short: `at least ${PASSWORD_MIN_LENGTH} characters`,
  needs_lowercase: 'a lowercase letter',
  needs_uppercase: 'an uppercase letter',
  needs_digit: 'a number',
  needs_special: 'a special character',
}

export function describePasswordProblems(problems: PasswordProblem[]): string | null {
  if (problems.length === 0) return null
  const parts = problems.map((p) => LABELS[p])
  const last = parts.pop() as string
  const joined = parts.length ? `${parts.join(', ')} and ${last}` : last
  return `Password needs ${joined}.`
}

export const PASSWORD_HINT =
  `At least ${PASSWORD_MIN_LENGTH} characters, with an uppercase and lowercase letter, a number and a special character.`

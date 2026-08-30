const all = ['session'] as const

/** Who the API says is signed in. See `useSession`. */
export const sessionKeys = {
  all: () => all,
  me: () => [...all, 'me'] as const,
}

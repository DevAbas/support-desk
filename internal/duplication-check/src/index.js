/**
 * duplication-check — a file written by copying another and changing the names.
 *
 * Why this exists, and why it is not jscpd
 * ---------------------------------------
 * Nothing here detects a copy. `tsc` type-checks both halves, the tests cover
 * both halves, the lint rules read both halves, and a reviewer reads a diff in
 * which every line is new. What it costs is paid later, by whoever has to find
 * all the copies to change one thing.
 *
 * The obvious tool is jscpd, and it cannot see this class of defect at all. Its
 * three modes — `strict`, `mild`, `weak` — filter tokens by *type*: `ignore`,
 * `empty`, `new_line`, `comment`. None of them normalises an identifier or a
 * string, and the hash is over the token values. So renaming `ticket` to
 * `customer` while copying is enough to make a copy invisible to it. Measured on
 * this repository at its default `minTokens: 50`, jscpd reports `Input`/`Textarea`
 * and `LoginPage`/`RegisterPage`, which are two primitives and two screens that
 * are parallel on purpose, and reports nothing for `useBulkDeleteTickets` and
 * `useBulkDeleteCustomers`, which are the same file twice. It inverts the signal
 * and the noise.
 *
 * `jsinspect-plus` has the right mechanism — it compares AST shape and ignores
 * identifiers — and was rejected for two smaller reasons: it depends on a beta
 * release of `@babel/parser`, and it thresholds on an absolute node count, which
 * is the measurement that does not work here. See `detector.js` for why.
 *
 * So the detector is fifty lines over the parser the lint pass already loads,
 * and it lives in this repository, where its threshold and its exemptions show
 * up in a diff.
 *
 * The recorded pairs below are the ratchet
 * ----------------------------------------
 * This repository is deliberately two of everything: tickets and customers are
 * built unalike on purpose and built in parallel anyway, so a threshold set high
 * enough to clear the parallelism would clear everything. Instead every pair over
 * the line today is written down here with the reason it is there, exactly as
 * `ROLLOUT` records a rule's outstanding violations. A pair that is not on this
 * list fails the check. A pair on the list that has been collapsed also fails the
 * check, because a stale entry is a claim nobody has re-read — deleting it is one
 * line in a diff, which is where a threshold argument belongs.
 */

/** Below this run length, in AST nodes, a match is coincidence and not a copy. */
export const WINDOW = 25

/**
 * The share of the smaller file that has to be the same shape.
 *
 * 0.85 means "most of this file is that file". It is high because the metric it
 * thresholds is a proportion rather than a size, and because what is worth
 * failing a build over is a file that was copied, not two files that happen to
 * open the same way.
 *
 * What that rules out is measured and specific, and is in the README: at 0.85
 * this check does not see `SavedViewNameDialog` against `TicketMoveReasonDialog`,
 * which share 48% of their shape and a verbatim comment.
 */
export const MIN_SHARE = 0.85

/** Neither a test's fixtures nor a barrel is a file anybody copied. */
export const IGNORED = [/\.test\.[cm]?[jt]sx?$/, /(?:^|\/)__tests__\//, /(?:^|\/)index\.ts$/]

/**
 * Every pair over the line today, and why it is allowed to be.
 *
 * `kind` is the part that matters. `parallel` is a shape two files share because
 * the design asked for two of them; collapsing one of these would be the defect.
 * `duplication` is a copy nobody has collapsed yet — a finding, recorded rather
 * than fixed, so that the sensor could ship without a refactor riding along with
 * it.
 */
export const RECORDED = [
  {
    kind: 'parallel',
    left: 'apps/web/src/features/customers/components/CustomerPlanBadge.tsx',
    right: 'apps/web/src/features/tickets/components/TicketStatusBadge.tsx',
    // The domain-to-presentation mapping, one per vocabulary. Both are a
    // `Record<DomainUnion, BadgeStatus>` and a one-line component, and that is
    // the whole point of them: `Badge` never learns what a ticket is, and a
    // fifth status or a fifth plan is a compile error rather than a grey badge.
    // One generic component keyed by two unions is the thing this shape exists
    // to avoid.
    reason: 'one domain-to-presentation map per vocabulary, which is why Badge has neither',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/customers/components/CustomerPlanBadge.tsx',
    right: 'apps/web/src/features/tickets/components/TicketPriorityBadge.tsx',
    reason: 'one domain-to-presentation map per vocabulary, which is why Badge has neither',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/tickets/components/TicketPriorityBadge.tsx',
    right: 'apps/web/src/features/tickets/components/TicketStatusBadge.tsx',
    reason: 'one domain-to-presentation map per vocabulary, which is why Badge has neither',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/reports/hooks/useReportAssignees.ts',
    right: 'apps/web/src/features/reports/hooks/useReportBreakdown.ts',
    // Three endpoints, three query hooks, each naming its own key and its own
    // fetcher. The shape is `useQuery` with `keepPreviousData`, which is what
    // every read in this app is; the alternative is one hook taking an endpoint,
    // which loses the return type.
    reason: 'one typed query hook per endpoint, which is how every read here is written',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/reports/hooks/useReportAssignees.ts',
    right: 'apps/web/src/features/reports/hooks/useReportSummary.ts',
    reason: 'one typed query hook per endpoint, which is how every read here is written',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/reports/hooks/useReportBreakdown.ts',
    right: 'apps/web/src/features/reports/hooks/useReportSummary.ts',
    reason: 'one typed query hook per endpoint, which is how every read here is written',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/tickets/hooks/useTicket.ts',
    right: 'apps/web/src/features/tickets/hooks/useTicketMoves.ts',
    reason: 'one typed query hook per endpoint, which is how every read here is written',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/features/auth/sessionKeys.ts',
    right: 'apps/web/src/features/plans/planKeys.ts',
    // The same argument as the query hooks above, one layer down. Six features
    // declare a key factory — `sessionKeys`, `customerKeys`, `planKeys`,
    // `reportKeys`, `searchKeys`, `ticketKeys` — and every one is a private
    // `all` tuple under an object of thunks that spread it, because that is what
    // stops a key being written as an inline array at a call site and quietly
    // splitting the cache. These two are the pair over the line because they are
    // the only two with nothing to key on: the other four import a filter, a
    // query or an id and take it as a parameter, and that is shape enough to put
    // them under the threshold, where here the shared frame is the whole file.
    // Collapsing the two into one factory taking a namespace would take the
    // literal keys out of the feature that owns them, which is what this shape
    // is for.
    reason: 'one cache-key factory per feature, which is how every key here is written',
  },
  {
    kind: 'parallel',
    left: 'apps/web/src/lib/api/reports.ts',
    right: 'apps/web/src/lib/api/search.ts',
    // The client half of the same thing: a function per endpoint, each parsing
    // its own response against its own schema. A generic caller would have to be
    // handed the schema, which is the line that carries the type.
    reason: 'one typed fetcher per endpoint, each parsing against its own schema',
  },
  {
    kind: 'parallel',
    left: 'packages/ui/src/components/Toolbar/Toolbar.tsx',
    right: 'packages/ui/src/primitives/Badge/Badge.tsx',
    // Both are the design system's smallest shape: a `Record<Union, string>` of
    // class strings above a component that picks one. That shape is the design
    // system's answer to branching and appears in most of the primitives; these
    // two are the two small enough for it to be most of the file.
    reason: 'the variant lookup every primitive is built from, in the two files small enough to be mostly it',
  },
  {
    kind: 'duplication',
    left: 'apps/web/src/features/customers/hooks/useBulkDeleteCustomers.ts',
    right: 'apps/web/src/features/tickets/hooks/useBulkDeleteTickets.ts',
    // 100% of both files. Identical `useMutation` with an `onSuccess` that
    // removes each detail key and invalidates the list; only the nouns and the
    // key namespace differ. A `useBulkDelete(keys, mutationFn)` taking the key
    // factory is the missing abstraction, and both call sites already have one.
    reason: 'a real copy: the same bulk-delete mutation twice, awaiting a shared hook',
  },
  {
    kind: 'duplication',
    left: 'apps/web/src/features/auth/useSignIn.ts',
    right: 'apps/web/src/features/auth/useSignUp.ts',
    // 100% of both files, in the same directory. Two mutations that post a
    // credential and seed the session cache with the answer.
    reason: 'a real copy: two credential mutations in one directory, awaiting a shared hook',
  },
  {
    kind: 'duplication',
    left: 'apps/web/src/features/customers/customersCsv.ts',
    right: 'apps/web/src/features/tickets/ticketsCsv.ts',
    // 87%. The quoting is already shared in `lib/csv.ts`; what is copied is the
    // four-part shape around it — a header tuple, a MIME constant, a row mapper
    // and a filename builder.
    reason: 'a real copy: the shape around lib/csv.ts written twice, awaiting a shared builder',
  },
]

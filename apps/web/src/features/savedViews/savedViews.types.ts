/**
 * A saved view is a named set of filters that belongs to a screen.
 *
 * There is one mechanism and there are two screens, so everything that differs
 * between them is in `SavedViewScope` and everything that does not is in this
 * folder. That split is the whole point of the folder: adding saved views to a
 * third screen is writing a scope, not writing a second sidebar and a second
 * dialog.
 *
 * A view never reaches the API and is not in the query cache either. It is a
 * shortcut the person using the screen keeps for themselves, so it lives in
 * their browser.
 */

/** As much of a view as the sidebar draws: what it is called, and which one it is. */
export interface SavedViewSummary {
  id: string
  name: string
}

/**
 * A view, with the filters it stands for.
 *
 * Generic over the filters rather than over some filter type defined here,
 * because the two screens' filters are genuinely different shapes — a widened
 * single value on the ticket queue, a set on the customer list — and one type
 * wide enough to hold both would be wrong for each. Nothing in this folder ever
 * reads a field of `TFilters`. The scope does that, and only the screen writes a
 * scope.
 */
export interface SavedView<TFilters> extends SavedViewSummary {
  filters: TFilters
}

/**
 * How a screen describes its filters to the mechanism.
 *
 * Six answers, and between them they are the whole of what one screen knows
 * that another does not: where its views are kept, what it calls the absence of
 * one, what the save dialog says it is about to store, what "no filters" means,
 * what the canonical form of a combination is, and how to get a combination
 * back out of storage anything may have written to.
 */
export interface SavedViewScope<TFilters> {
  /**
   * The `localStorage` key this screen's views live under.
   *
   * One key per screen rather than one document holding every screen's: two
   * screens then never write over each other, an entry one of them cannot parse
   * cannot take the other's views down with it, and a third screen coordinates
   * with nothing to get its own.
   *
   * Written out rather than derived from the screen's name, because the ticket
   * key predates there being more than one screen and renaming it would lose
   * every view already saved.
   */
  storageKey: string
  /** What the row for "no view selected" says: "All tickets". */
  allLabel: string
  /** Which filters the save dialog says are about to be stored under the name. */
  filtersDescription: string
  /** The filters the screen shows when no view is selected. */
  defaultFilters: TFilters
  /**
   * The canonical form of a combination: the one that is stored, and the one
   * that is compared.
   *
   * This is where a screen says which differences are not differences — a
   * trailing space in a search the server trims, two plans chosen in the other
   * order. Everything else about "would these two produce the same list" is
   * shared; see `sameFilters.ts`.
   */
  normaliseFilters: (filters: TFilters) => TFilters
  /**
   * Narrows something read out of storage back to this screen's filters, or
   * `null` when it is not a set of them.
   *
   * Storage is shared with older builds of the app and with whatever else has
   * written to this origin, so nothing that comes back is trusted: a malformed
   * entry — or a status that has since been removed from the domain — is
   * dropped rather than allowed to break the screen.
   */
  parseFilters: (value: unknown) => TFilters | null
}

/**
 * The saved views on a screen, as the sidebar needs them.
 *
 * This is `useSavedViews`'s return type and it is `SavedViewsSidebar`'s props,
 * which is why it is one type rather than two: everything the mechanism works
 * out is everything the sidebar draws, so a screen wires the two together with
 * a spread and there is no third place for them to disagree.
 */
export interface SavedViewsPanel {
  /** Both from the scope. The sidebar is the only thing that says either out loud. */
  allLabel: string
  filtersDescription: string
  views: readonly SavedViewSummary[]
  /** `null` means no saved view is selected: the screen is showing everything. */
  activeViewId: string | null
  /** True when the filters on screen have drifted from what is selected. */
  isModified: boolean
  onSelectView: (id: string | null) => void
  onSaveView: (name: string) => void
  onRenameView: (id: string, name: string) => void
  onDeleteView: (id: string) => void
}

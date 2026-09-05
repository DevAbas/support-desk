/**
 * aria-modal-needs-focus-trap — a claim that the page behind is gone, with nothing making it so.
 *
 * Why this rule exists
 * --------------------
 * `aria-modal="true"` does one thing: it tells a screen reader that everything
 * outside this element is not there. It does not make that true for anybody
 * else. A keyboard walks straight out of a dialog that only says it is modal,
 * into a page the reader has just been told does not exist, with no way back
 * except finding the dialog again — and no way to know it happened, because
 * nothing on screen changes.
 *
 * `packages/ui/README.md` states it exactly:
 *
 *   "The trap is the other half of `aria-modal`, which says the rest of the page
 *   is inert: without it that is a claim the keyboard immediately contradicts."
 *
 * This repository has been on both sides of that. `Modal` and `Drawer` each
 * carried their own `aria-modal` with no trap under it; the fix collapsed both
 * onto `Dialog`, which sets the attribute once (`Dialog.tsx:91`) and calls
 * `useFocusTrap` eleven lines earlier. The attribute now appears in exactly one
 * source file, and that file traps.
 *
 * So this rule catches nothing today, and that is the whole point of it. The
 * defect it exists for was written twice, was fixed by a refactor rather than by
 * a rule, and nothing stops the third time — a component that needs a dialog and
 * reaches for the attribute instead of the primitive. The pairing is invisible
 * to `tsc`, invisible to a screenshot, and invisible to axe, which reads the
 * attribute and cannot press Tab.
 *
 * Known limitations
 * -----------------
 * **It checks the file, not the element.** A file containing both an
 * `aria-modal` and a `useFocusTrap` passes even if the trap belongs to a
 * different element. Following the ref from the attribute to the hook call is a
 * data-flow question ESLint's syntactic pass cannot answer, and the looser check
 * still forces the two to be written together where a reviewer sees both.
 *
 * **`useFocusTrap` is matched by name.** A trap implemented some other way — an
 * `inert` attribute on the page behind, a third-party library — is reported, and
 * the honest fix is to add the exemption here with the reason attached, in a
 * diff to this file.
 *
 * **It does not check the rest of the dialog contract.** Escape, focus moved in
 * on open, focus restored on close, the accessible name: all of them are as
 * necessary as the trap and none is checked. `Dialog.test.tsx` asserts each of
 * them against the real DOM, which is the layer that can.
 */

/** The hook that makes `aria-modal` true, and where it lives. */
const FOCUS_TRAP = 'useFocusTrap'

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Back an aria-modal element with a focus trap, which is what makes it true',
    },
    schema: [],
    // One or two sentences: what to use, where it lives, where the reasoning is.
    messages: {
      unbackedAriaModal:
        'An element with aria-modal must trap focus: render Dialog, Modal or Drawer from ' +
        '@support-desk/ui, or call useFocusTrap. Otherwise Tab walks out into a page the ' +
        'reader was told is not there. See internal/eslint-plugin-harness/README.md.',
    },
  },

  create(context) {
    const claims = []
    let trapsFocus = false

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return
        if (node.name.name !== 'aria-modal') return
        // `aria-modal={false}` and `aria-modal="false"` claim nothing.
        if (isExplicitlyFalse(node.value)) return

        claims.push(node)
      },

      // Matched wherever the name appears — the import, the call, or a re-export
      // — because a file that has gone to the trouble of naming the hook is a
      // file where the pairing is visible to a reader.
      Identifier(node) {
        if (node.name === FOCUS_TRAP) trapsFocus = true
      },

      'Program:exit': function () {
        if (trapsFocus) return

        for (const node of claims) {
          context.report({ node, messageId: 'unbackedAriaModal' })
        }
      },
    }
  },
}

function isExplicitlyFalse(value) {
  if (value === null) return false

  if (value.type === 'Literal') return value.value === false || value.value === 'false'

  if (value.type === 'JSXExpressionContainer') {
    return value.expression.type === 'Literal' && value.expression.value === false
  }

  return false
}

/**
 * Shadow DOM Adapter: Reaches through shadow roots to find deeply nested active elements.
 */

export class ShadowDomAdapter {
  /**
   * Resolves the real active element even if embedded inside multiple shadow roots.
   */
  public static getDeepActiveElement(): Element | null {
    let active = document.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active;
  }
}

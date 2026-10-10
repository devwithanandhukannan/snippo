/**
 * Onboarding Flow Controller: 3-step first-run experience.
 */

import { Snippet } from '../../core/types';
import { SnippetStore } from '../../data/store';

class OnboardingController {
  private chosenTrigger = '/intro';
  private chosenBody = "Hi there, I'm using Snippo to type faster and save time!";

  public init(): void {
    this.bindStep1();
    this.bindStep2();
    this.bindStep3();
  }

  private setStep(stepNum: number): void {
    [1, 2, 3].forEach((n) => {
      const stepEl = document.getElementById(`step-${n}`);
      const dotEl = document.getElementById(`dot-${n}`);
      if (stepEl) stepEl.style.display = n === stepNum ? 'flex' : 'none';
      if (dotEl) dotEl.classList.toggle('active', n === stepNum);
    });
  }

  private bindStep1(): void {
    const triggerInput = document.getElementById('ob-trigger') as HTMLInputElement;
    const bodyInput = document.getElementById('ob-body') as HTMLTextAreaElement;
    const btnNext = document.getElementById('btn-next-step-1');

    btnNext?.addEventListener('click', async () => {
      const trig = triggerInput.value.trim() || 'intro';
      this.chosenTrigger = trig.startsWith('/') ? trig : '/' + trig;
      this.chosenBody = bodyInput.value.trim() || 'Hi there!';

      // Save snippet to store
      const newSnippet: Snippet = {
        id: 'snip-onboarding',
        trigger: this.chosenTrigger,
        body: this.chosenBody,
        description: 'First snippet from onboarding',
        folder: 'General',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      };

      await SnippetStore.saveSnippet(newSnippet);

      // Setup step 2 labels
      const label = document.getElementById('practice-trigger-label');
      const hint = document.getElementById('hint-trigger-badge');
      if (label) label.textContent = this.chosenTrigger;
      if (hint) hint.textContent = this.chosenTrigger;

      this.setStep(2);
      const sandboxInput = document.getElementById('sandbox-input') as HTMLInputElement;
      sandboxInput?.focus();
    });
  }

  private bindStep2(): void {
    const sandbox = document.getElementById('sandbox-input') as HTMLInputElement;
    const btnNext = document.getElementById('btn-next-step-2') as HTMLButtonElement;
    const hint = document.getElementById('sandbox-hint');

    sandbox?.addEventListener('input', () => {
      const val = sandbox.value;
      if (val.endsWith(this.chosenTrigger)) {
        // Expand!
        const start = val.length - this.chosenTrigger.length;
        sandbox.value = val.slice(0, start) + this.chosenBody;
        sandbox.classList.add('expanded');
        if (btnNext) btnNext.disabled = false;
        if (hint) {
          hint.innerHTML = '<strong>Expanded!</strong> Look at how fast that was.';
          hint.style.color = 'var(--success-text)';
        }
      }
    });

    btnNext?.addEventListener('click', () => {
      this.setStep(3);
    });
  }

  private bindStep3(): void {
    document.getElementById('btn-finish-onboarding')?.addEventListener('click', () => {
      const managerUrl = chrome.runtime.getURL('ui/manager/index.html');
      window.location.href = managerUrl;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const ob = new OnboardingController();
  ob.init();
});

// Plain-language definitions for technical terms used across this site.
// Used by the <Wtf> component (inline popover) and the /glossary page.
// Add entries sparingly — only where the gloss truly earns its keep.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: Record<string, GlossaryEntry> = {
  'biorxiv': {
    term: 'bioRxiv',
    definition: 'A free, open repository where biology researchers post papers before formal peer review. A public draft folder for the field.',
  },
  'multivariate-triple-network': {
    term: 'multivariate triple-network analysis',
    definition: 'Looking at how three brain networks coordinate over time — the default mode network (self-referential thinking), the central executive network (focused work), and the salience network (the switch between them). The dynamics between them, not the regions themselves, are what we mean by identity.',
  },
  'fmri': {
    term: 'fMRI',
    definition: 'Functional magnetic resonance imaging. A way of measuring brain activity by tracking blood flow — when a region works harder, blood rushes in. Indirect, slow, but non-invasive.',
  },
  'bold-signal': {
    term: 'BOLD signal',
    definition: 'Blood-Oxygen-Level-Dependent signal. The actual thing an fMRI scanner measures. It tracks oxygen-rich blood flow in the brain — a stand-in for brain-cell activity, not the activity itself.',
  },
  'sparse-autoencoder-features': {
    term: 'sparse autoencoder features',
    definition: 'Small, identifiable pieces of a language model\u2019s internal state. You can find them, watch them fire, and intervene on them. Roughly: discovering individual features that activate for things like "danger" or "I am being tested" — but inside software, not a brain.',
  },
  'persona-and-emotion-vectors': {
    term: 'persona vectors, emotion vectors',
    definition: 'Directions inside a language model\u2019s internal space that correspond to traits or feelings. You can move the model along them and watch its behavior shift — making it more cautious, more rushed, more hopeful, more guilty.',
  },
  'activation-verbalizers': {
    term: 'activation verbalizers',
    definition: 'A trick where you ask a smaller model to describe, in plain English, what a larger model is "doing" at a given moment. Imperfect — the smaller model sometimes invents something plausible that isn\u2019t actually there — but useful for spotting patterns the math alone won\u2019t name.',
  },
  'phenomenal-consciousness': {
    term: 'phenomenal consciousness',
    definition: 'The "something it is like to be" something — whether a system has inner experience, not just behavior. Sometimes called qualia. The hardest unresolved question in philosophy of mind.',
  },
};

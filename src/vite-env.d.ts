/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Formspree form ID (the part after /f/ in your Formspree endpoint).
   * Create one free form at https://formspree.io and put its ID here.
   * Used for both the RSVP and the Wishes forms; submissions are
   * distinguished by a hidden `type` field.
   */
  readonly VITE_FORMSPREE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

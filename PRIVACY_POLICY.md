# Privacy Policy for AegisMark

**Effective Date:** November 10, 2026  
**Developer:** Sakib (sakibcraft@gmail.com)  
**Product:** AegisMark — Cross-Platform End-to-End Encrypted Bookmarks Extension & Hub

---

### 1. Fundamental Principle: Zero-Knowledge Privacy by Design
AegisMark is engineered from the ground up to guarantee that your personal browsing habits, bookmarks, reading lists, and organization structures remain strictly confidential. We operate on a **zero-knowledge cryptographic model**:
- All bookmark URLs, page titles, private notes, folder structures, and tags are encrypted on your local client device using authenticated **AES-256-GCM** encryption before any data is written to disk or transmitted to our synchronization relay.
- Your master passphrase and 24-word emergency recovery phrase are **never transmitted to any server** in any form.
- The encryption keys are derived client-side via **PBKDF2-HMAC-SHA256 with 600,000 iterations**. Even in the event of an unauthorized server breach, your bookmark contents remain mathematically unreadable.

---

### 2. Information We Never Collect or Store
- We never collect, inspect, or log your plaintext bookmark URLs, titles, notes, or tags.
- We never track your browsing history or un-bookmarked tabs.
- We never include third-party advertising SDKs, behavioral analytics scripts, or telemetry trackers.
- We never sell, rent, or trade your personal data.

---

### 3. Permissions Justification & Least Privilege
AegisMark requests only the minimum permissions necessary to perform its advertised functions:

| Permission | Purpose & Justification |
| :--- | :--- |
| **`activeTab`** | Used exclusively to read the URL and page title of the currently focused tab when you explicitly click the extension icon or press the quick-save shortcut (`Alt+Shift+S`). It never runs in the background across arbitrary tabs. |
| **`storage`** | Used strictly to persist your encrypted vault records and extension preferences locally within your browser's IndexedDB and extension storage. |
| **`alarms`** | Used solely to enforce the 15-minute inactivity security lock without background CPU or battery drain. |
| **`bookmarks` (Optional)** | Declared strictly as an optional permission. Only requested at runtime if you explicitly choose to invoke "Import from Browser Bookmarks" or "Export to Browser Bookmarks". |

---

### 4. Data Retention, Backups & Deletion
- **Local Vaults:** All data is stored within your browser's local IndexedDB sandbox. You can permanently wipe your vault at any time via the Security & Privacy Center.
- **Trash Bin:** Deleted bookmarks are held in a local 30-day Trash bin for accidental deletion protection, after which they are permanently purged.
- **Account Deletion:** Users can request immediate and permanent deletion of any cloud relay sync records via the in-app account controls.

---

### 5. Contact & Inquiries
For questions, security disclosures, or privacy inquiries, contact:  
**Sakib** — sakibcraft@gmail.com

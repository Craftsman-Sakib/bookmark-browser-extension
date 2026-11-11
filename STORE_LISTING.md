# AegisMark Extension Store Listing & Metadata

**Target Stores:** Chrome Web Store · Microsoft Edge Add-ons · Mozilla Firefox AMO · Apple Safari Web Extensions  
**Owner / Developer:** Sakib (sakibcraft@gmail.com)  
**License:** MIT License

---

### Product Title
**AegisMark — Private E2EE Bookmarks & Cross-Browser Sync**

### Short Description (max 132 chars)
Zero-knowledge end-to-end encrypted bookmarks manager with local-first storage and cross-device sync for Chrome, Edge, and Firefox.

---

### Detailed Description

Take complete ownership of your bookmarks with **AegisMark**—the privacy-first browser extension engineered for power users, researchers, engineers, and privacy-conscious professionals.

Traditional bookmark managers and browser sync services store your bookmarks in clear plaintext on third-party cloud servers, building detailed profiles of your interests, reading habits, and private research. 

AegisMark changes that forever with **zero-knowledge, client-side encryption**. Every bookmark title, URL, folder, and private note is encrypted on your device using **AES-256-GCM** with keys derived from your master passphrase via **PBKDF2 (600,000 iterations)**. Even if our servers were compromised, your bookmarks remain mathematical noise to anyone without your master passphrase.

#### Core Features:
- ⚡ **1-Click Quick Save:** Capture your active tab with page title and favicon in under 50ms using the extension toolbar or hotkey (`Alt+Shift+S` / `Cmd+Shift+S`).
- 🔒 **Zero-Knowledge Architecture:** AES-256-GCM authenticated encryption ensures true privacy. The sync server only stores blind ciphertext.
- 📂 **Flexible Organization:** Nested folders, custom tag clouds, instant client-side search across decrypted bookmarks, and favorites.
- 🗑️ **30-Day Trash Bin:** Accidental deletion protection with 1-click restore.
- 🔑 **BIP39 24-Word Recovery Phrase:** Standard cryptographic emergency recovery key ensures you never get locked out if you forget your master passphrase.
- 🌐 **Native Browser Integration:** 1-click migration to and from Chrome, Edge, and Firefox native bookmarks trees.
- 🛡️ **Offline Local-First Core:** 100% of your bookmarks function completely offline without an internet connection or server account.
- 📦 **No Vendor Lock-in:** Export your data at any time in encrypted `.aegis` format or standard Netscape HTML.

---

### Category
- Productivity
- Privacy & Security

### Permissions Justification (For Store Reviewers)
- `activeTab`: Used strictly when the user activates the extension popup to capture current tab URL and title.
- `storage`: Required to store local encrypted vault records and extension settings.
- `alarms`: Enforces the 15-minute inactivity security lock without consuming background CPU or battery.
- `bookmarks (Optional)`: Only requested if the user chooses to import/export native browser bookmarks.

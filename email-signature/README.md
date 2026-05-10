# Pluviometrics Email Signature Pack

Outlook-compatible email signature for Mark O'Callaghan (Founder & Director, Pluviometrics).

## Files

| File | Purpose |
|------|---------|
| `pluviometrics-signature.html` | Standalone preview document. Open in a browser to see how the signature will render. |
| `pluviometrics-signature-copyable.html` | The install file. Open in a browser, copy the rendered signature, paste into Outlook. |
| `pluviometrics-signature-fragment.html` | The raw signature table (inline CSS only). For developers embedding the signature into a mail platform that accepts HTML directly (e.g. Gmail templates, Front, HubSpot). |
| `pluviometrics-signature-plain-text.txt` | Plain-text fallback for clients that strip HTML. |
| `README.md` | This file. |

## Install steps (Outlook desktop — Windows)

**Do not paste the raw HTML source into Outlook.** Outlook's signature editor treats pasted HTML source as literal text and will display the markup verbatim. You must paste the *rendered* signature.

1. Open `pluviometrics-signature-copyable.html` in a web browser (double-click the file in Explorer, or right-click → Open with → your browser).
2. Wait for the Pluviometrics logo to fully load.
3. Click just before **Mark O'Callaghan**, then Shift+Click just after the **Atmos — Live Radar & Nowcasting** line so the whole signature block (logo + text) is highlighted.
4. Press **Ctrl + C** to copy.
5. In Outlook: **File → Options → Mail → Signatures…**
6. Click **New**, give it a name (e.g. *Pluviometrics*), then click into the large signature editor area.
7. Press **Ctrl + V** to paste. The logo and formatting should appear.
8. Set it as the default signature for **New messages** and **Replies/forwards** if desired.
9. Click **OK**, then send a test email to yourself to confirm the logo renders for the recipient.

## Install steps (Outlook on the web / Outlook 365)

1. Open `pluviometrics-signature-copyable.html` in a browser and copy the rendered signature (steps 1–4 above).
2. In Outlook on the web: **Settings (gear icon) → Mail → Compose and reply**.
3. Under **Email signature**, paste with **Ctrl + V**.
4. Tick the boxes for automatic inclusion on new messages / replies if desired.
5. **Save**.

## Plain-text clients

Some recipients or company policies strip HTML from incoming mail. The `.txt` file mirrors the signature for those cases. Outlook lets you set a separate plain-text signature under the same Signatures dialog.

## Logo

The signature references the public Pluviometrics logo at:

```
https://pluviometrics.com.au/Assets/Logos/pluviometrics-main.png
```

This URL must remain reachable for the logo to render in recipients' inboxes. The local source asset (do not modify) is:

```
D:\repos\pluviometrics\pluviometrics-hub\Assets\Logos\Logo_Pluviometrics.png
```

If the public logo URL is ever changed, update the `<img src="...">` value in:

- `pluviometrics-signature-fragment.html`
- `pluviometrics-signature.html`
- `pluviometrics-signature-copyable.html`

## Troubleshooting

- **Logo shows as a red X / broken image in recipient's inbox** — the public logo URL is unreachable, or the recipient's mail client blocks remote images by default. Ask them to enable images for your address.
- **Pasting shows raw HTML tags** — you copied the *source* file, not the *rendered* page. Open `pluviometrics-signature-copyable.html` in a browser first, then copy from the rendered page.
- **Signature looks misaligned in dark mode** — Outlook's dark mode can invert colors on some elements. The signature uses dark text on a transparent background which is generally safe, but if a recipient reports issues, send a test to a dark-mode Outlook to confirm.

## Do not

- Modify, recolour, crop, or redesign any Pluviometrics / Stormgauge / Atmos logo.
- Replace the table layout with flexbox or grid (Outlook's Word-based renderer does not support either reliably).
- Move CSS into a `<style>` block in the fragment — Outlook strips `<style>` from pasted signatures. Keep all CSS inline on each element.

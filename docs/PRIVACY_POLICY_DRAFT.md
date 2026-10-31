# UndoLink Privacy Policy — Draft for Review

**Draft date:** October 31, 2026  
**Service:** UndoLink (https://undolink.pages.dev)  
**Operator:** Independently operated by an individual (not presented as a registered company).

> **Review note:** This policy describes the current application based on a code review. It is not legal advice or a guarantee of compliance. The operator should obtain qualified local advice when feasible.

## 1. About this policy

This policy explains what information UndoLink processes when you use the website, create temporary links, use an account, or contact support.

UndoLink is a link-management service. It lets you create redirect links with settings such as expiry times, click limits, scheduled start times, and optional passwords.

UndoLink is independently operated by an individual. It is not being presented as a company or incorporated entity.

## 2. Information we process

### Information you provide

- **Account information:** your email address and password when you register or sign in.
- **Support requests:** the name you choose to provide, your email address, subject, and message when you use the support form.
- **Link information:** the destination URL you submit, and settings such as a custom slug, expiry time, scheduled start, click limit, and optional link password.

Please do not put passwords, private link-management keys, or other sensitive information in a support message.

### Information created by using UndoLink

Depending on how you use the service, our systems process:

- Link slugs, creation and expiry times, click counts, and link status.
- A record of click timestamps for link activity.
- Account session records, including creation and expiry times.
- Email-verification and password-reset token records. The token values are stored as hashes.
- Password salts and password hashes rather than account passwords in readable form.
- Hashed IP-address values used for rate limiting and abuse prevention.
- Limited technical diagnostic information when account creation encounters an error.

UndoLink's link-click records are used for click counts and recent activity. The current application records click timestamps; it does not display a visitor's identity to link owners.

### Information stored in your browser

If you create links without signing in, UndoLink saves link details and the private management key in your browser's local storage so you can manage those links on that device. Anyone with access to that browser profile may be able to access this locally stored information. Keep your device and browser account secure.

For signed-in users, the website uses a session cookie named `undolink_session`. It is configured as HttpOnly, Secure, and SameSite=Lax, with a 30-day maximum lifetime. The server stores a hash of the session token.

## 3. How we use information

We use information to:

- Create, redirect, manage, pause, and expire temporary links.
- Apply click limits, scheduled start times, and optional password protection.
- Provide account registration, sign-in, email verification, password recovery, and session management.
- Display link activity to the person who manages a link.
- Reply to support requests.
- Apply rate limits, prevent abuse, protect the service, and troubleshoot errors.

## 4. Service providers

UndoLink relies on third-party providers to operate:

- **Cloudflare:** hosts the website and Worker application and provides the D1 database used for application records. Cloudflare may process technical information, including IP addresses, as part of delivering and securing the service.
- **Resend:** sends account-related emails such as email verification and password-reset messages.
- **Google Apps Script and Gmail:** receive and deliver messages submitted through the UndoLink support form.
- **Google Fonts:** supplies website fonts.
- **cdnjs:** supplies the QR-code library used by the website.

These providers process information as needed to provide their services and under their own terms and privacy policies. Provider infrastructure may process or store information in countries other than yours.

## 5. Sharing and disclosure

We do not sell personal information. We share information with the service providers listed above when necessary to operate UndoLink. We may also disclose information when required by applicable law or when reasonably necessary to protect the service, its users, or others from fraud, abuse, or security threats.

A temporary link may reveal its destination to anyone who can access the redirect or the destination itself. Anyone with a link's private management key may be able to manage that link. Anyone who receives a password-protected link and its password may be able to open it. Share links, passwords, and management keys carefully.

## 6. Retention

We keep information for as long as it is needed to operate the service, maintain accounts and links, provide support, and address security or legal needs.

You can delete individual links using the available link-management controls. The current website does not provide an automatic self-service account-deletion control. If you want to request account or personal-information deletion, contact us through the support page. We will review the request and handle it where appropriate and technically possible, subject to applicable requirements and any information we need to retain.

Support messages are delivered to the UndoLink support inbox and may remain there until they are deleted. The current service does not publish a fixed retention schedule for all database records, diagnostics, or provider-side records.

## 7. Security

UndoLink uses measures such as password hashing, hashed session tokens, secure session cookies, rate limiting, and access controls for link management. No website or online transmission can be guaranteed completely secure. Keep your account password and link-management keys private, and tell us through the support page if you believe an account or link has been accessed without permission.

## 8. Your choices

You can:

- Choose whether to create links as a guest or sign in to an account.
- Avoid providing an optional name in the support form.
- Delete links using the available management controls.
- Contact support to ask about information associated with your account or to request deletion.

You can also clear local storage in your browser, but doing so may remove guest link records and management keys saved on that device. Clearing browser storage does not delete account or link records held by the service.

## 9. Third-party websites

UndoLink redirects to destination websites chosen by users. Those websites are operated by third parties and have their own privacy practices. This policy does not cover them. Check the destination website's policy before providing information there.

## 10. Changes to this policy

We may update this policy as UndoLink changes. The updated version will show a revised date. If a change is important, we will take reasonable steps to make it noticeable.

## 11. Contact

For privacy questions or requests, contact UndoLink through the support page:

https://undolink.pages.dev/support.html

You can also contact the operator through **undolink.support@gmail.com**.

---

**Ongoing review items:** confirm any legally required operator-identification details; verify provider retention and international-transfer details; keep account-deletion handling accurate; and review any additional notices required by laws applying to the operator and users.

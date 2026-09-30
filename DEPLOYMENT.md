# Deployment

## One-time Firebase setup

1. In the Firebase console for `balaji-shop-1cd6f`, create the Firestore database if it does not exist. Use production mode; the repository's rules control access.
2. Enable Firebase Storage in the project. The checked-in Storage rules expose images for public viewing while limiting uploads and deletes to the signed-in admin and image files under 5 MB.
3. In Authentication > Sign-in method, enable Email/Password and Phone providers. Create the owner's admin user with email/password; do not add a public sign-up form. Configure the SMS region policy to allow the countries you expect to serve.
4. Copy the new user's UID from Authentication. In Firestore, create a document at `admins/{UID}` with the field `role` set to the string `admin`. This role document can only be managed from the Firebase console.
5. Add the production website domain to Authentication > Settings > Authorized domains. Phone sign-in uses Firebase's reCAPTCHA verifier and will not work on unapproved domains.
6. Before launch, configure Firebase App Check for the production domain and monitor requests before enabling enforcement.

Public visitors can create validated bookings and design requests. Only a signed-in user with an `admins/{UID}` role document can read or manage those requests. No credentials belong in this repository.

## Deploy

Install the Firebase CLI and sign in with an account that has access to the Firebase project:

```powershell
npm install -g firebase-tools
firebase login
```

From this project directory, deploy the database rules and static website:

```powershell
firebase deploy --only firestore:rules,storage,hosting
```

The project alias is set in `.firebaserc`. Verify a test booking appears in Firestore and in the signed-in admin portal, test admin password change and mobile recovery, and confirm a non-admin cannot read or change protected collections.
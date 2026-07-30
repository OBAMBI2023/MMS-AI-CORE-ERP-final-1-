import assert from "node:assert/strict";
import test from "node:test";
import {
  INVITATION_RATE_LIMIT_MESSAGE,
  resendExistingAuthInvitation,
  type ExistingInvitationAuth,
} from "./partner-invitation.ts";

test("plusieurs renvois conservent l'identité et ne créent jamais email_exists", async () => {
  const userId = "3b714c31-bcef-4513-9f1f-ce697baef0f5";
  const email = "admin@example.com";
  let createUserCalls = 0;
  let lookupCalls = 0;
  const resendCalls: unknown[] = [];
  const auth: ExistingInvitationAuth & {
    admin: ExistingInvitationAuth["admin"] & { createUser(): never };
  } = {
    admin: {
      async getUserById(requestedUserId) {
        lookupCalls += 1;
        return { data: { user: { id: requestedUserId, email } }, error: null };
      },
      createUser() {
        createUserCalls += 1;
        throw new Error("email_exists");
      },
    },
    async resend(credentials) {
      resendCalls.push(credentials);
      return { error: null };
    },
  };

  for (let click = 0; click < 3; click += 1) {
    await resendExistingAuthInvitation(auth, {
      userId,
      email,
      redirectTo: "https://erp.example.com/reset-password",
    });
  }

  assert.equal(createUserCalls, 0);
  assert.equal(lookupCalls, 3);
  assert.equal(resendCalls.length, 3);
  assert.deepEqual(
    resendCalls.map((call) => (call as { email: string }).email),
    [email, email, email],
  );
});

test("refuse de recréer un compte Auth manquant", async () => {
  const auth: ExistingInvitationAuth = {
    admin: {
      async getUserById() {
        return { data: { user: null }, error: null };
      },
    },
    async resend() {
      throw new Error("resend ne doit pas être appelé");
    },
  };

  await assert.rejects(
    resendExistingAuthInvitation(auth, {
      userId: "3b714c31-bcef-4513-9f1f-ce697baef0f5",
      email: "admin@example.com",
      redirectTo: "https://erp.example.com/reset-password",
    }),
    /Aucun compte n'a été recréé/,
  );
});

test("traduit proprement les erreurs d'e-mail invalide et d'expiration", async () => {
  const makeAuth = (message: string): ExistingInvitationAuth => ({
    admin: {
      async getUserById(userId) {
        return {
          data: { user: { id: userId, email: "admin@example.com" } },
          error: null,
        };
      },
    },
    async resend() {
      return { error: { message } };
    },
  });
  const input = {
    userId: "3b714c31-bcef-4513-9f1f-ce697baef0f5",
    email: "admin@example.com",
    redirectTo: "https://erp.example.com/reset-password",
  };

  await assert.rejects(
    resendExistingAuthInvitation(makeAuth("invalid email format"), input),
    /Adresse e-mail invalide/,
  );
  await assert.rejects(
    resendExistingAuthInvitation(makeAuth("otp_expired"), input),
    /invitation a expiré/,
  );
});

test("intercepte les erreurs Supabase rate_limit sans recréer le compte", async () => {
  let lookupCalls = 0;
  const auth: ExistingInvitationAuth = {
    admin: {
      async getUserById(userId) {
        lookupCalls += 1;
        return {
          data: { user: { id: userId, email: "admin@example.com" } },
          error: null,
        };
      },
    },
    async resend() {
      return {
        error: {
          code: "over_email_send_rate_limit",
          message: "email rate limit exceeded",
          status: 429,
        },
      };
    },
  };

  await assert.rejects(
    resendExistingAuthInvitation(auth, {
      userId: "3b714c31-bcef-4513-9f1f-ce697baef0f5",
      email: "admin@example.com",
      redirectTo: "https://erp.example.com/reset-password",
    }),
    new RegExp(INVITATION_RATE_LIMIT_MESSAGE),
  );
  assert.equal(lookupCalls, 1);
});

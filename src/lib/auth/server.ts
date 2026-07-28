/**
 * Server-side auth helpers using Appwrite.
 *
 * - createAccount: Users API (server SDK, master key) to create the user
 * - loginSession: Account API (client SDK) to verify password and create a session
 * - getSessionUser: verify a session token and return the user
 */


// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _usersClient: any = null;
let _initPromise: Promise<void> | null = null;

async function initUsers() {
  if (_usersClient) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const { Client, Users } = await import("node-appwrite");
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_SECRET_KEY!);
    _usersClient = new Users(client);
  })();
  await _initPromise;
}

export interface AtlasUser {
  id: string;
  name: string;
  email: string;
}

/** Create a new user in Appwrite. Password is handled natively. */
export async function createAccount(
  email: string,
  password: string,
  name: string,
): Promise<AtlasUser | null> {
  await initUsers();
  try {
    const user = await _usersClient!.create("unique()", email, undefined, password, name);
    return { id: user.$id, name: user.name, email: user.email };
  } catch (e) {
    console.error("[auth] createAccount failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Verify email+password and return a session cookie value. */
export async function loginSession(email: string, password: string): Promise<string | null> {
  try {
    const { Client, Account } = await import("node-appwrite");
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!);
    const account = new Account(client);
    const session = await account.createEmailPasswordSession(email, password);

    const cookie = JSON.stringify({
      userId: session.userId,
      secret: session.secret,
      expire: session.expire,
    });
    return Buffer.from(cookie).toString("base64");
  } catch (e) {
    console.error("[auth] loginSession failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Verify a session cookie and return the user. */
export async function verifySession(cookie: string): Promise<AtlasUser | null> {
  try {
    const decoded = JSON.parse(Buffer.from(cookie, "base64").toString());
    const { secret } = decoded;

    const { Client, Account } = await import("node-appwrite");
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setSession(secret);

    const account = new Account(client);
    const user = await account.get();
    return { id: user.$id, name: user.name, email: user.email };
  } catch {
    return null;
  }
}

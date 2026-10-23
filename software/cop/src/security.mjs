import {
  randomBytes,
  createHash,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(24).toString("base64url");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$32768$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password, hash) {
  const [scheme, n, salt, value] = hash.split("$");
  if (scheme !== "scrypt" || n !== "32768" || !salt || !value) return false;
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const expected = Buffer.from(value, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export function validPassword(p) {
  return typeof p === "string" && p.length >= 12 && p.length <= 200;
}
export function cookieToken(req, name = "cop_session") {
  return (req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
}
export function requireRole(user, ...roles) {
  if (!user.roles.some((r) => roles.includes(r)))
    throw Object.assign(new Error("Недостаточно прав"), { status: 403 });
}
export const publicUser = (u) => ({
  id: u.id,
  login: u.login,
  name: u.name,
  roles: u.roles,
  forceReset: u.force_reset,
});

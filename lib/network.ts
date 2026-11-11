import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'

/**
 * Neon's hostnames return both A and AAAA records. On networks with a broken
 * IPv6 route, Node's Happy Eyeballs (autoSelectFamily) keeps retrying the
 * unreachable AAAA addresses and the socket connect times out even though IPv4
 * works. Prefer IPv4 and connect sequentially so `pg` behaves like `psql`.
 */
setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

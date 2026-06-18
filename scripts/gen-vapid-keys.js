#!/usr/bin/env node
// Generates VAPID keys using Node.js built-in crypto (no deps required)
// Usage: node scripts/gen-vapid-keys.js

import { createECDH } from 'crypto'

const ecdh = createECDH('prime256v1')
ecdh.generateKeys()

console.log('\nVAPID Keys — save these as secrets:\n')
console.log(`VAPID_PUBLIC_KEY=${ecdh.getPublicKey('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${ecdh.getPrivateKey('base64url')}`)
console.log(`VAPID_SUBJECT=mailto:leads@atrium-gs.com`)
console.log('\nCloudflare Worker secrets (wrangler secret put):')
console.log('  wrangler secret put VAPID_PUBLIC_KEY')
console.log('  wrangler secret put VAPID_PRIVATE_KEY')
console.log('  wrangler secret put VAPID_SUBJECT')
console.log('\nVercel env var (add to dashboard + .env.local):')
console.log(`  VITE_VAPID_PUBLIC_KEY=${ecdh.getPublicKey('base64url')}\n`)

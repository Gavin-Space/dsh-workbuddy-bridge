/**
 * The conversation-identity headers the international chat gateway requires.
 *
 * @module dsh-workbuddy-bridge/international-identity
 *
 * The international endpoint (`www.workbuddy.ai/v2/chat/completions`) rejects a
 * request that carries no conversation identity with HTTP 400, code 11128
 * ("request illegal"), whose `displayTips` reads "This call failed channel
 * verification, possibly because it was not sent from an official client".
 * The CN endpoint accepts the same body without these headers, which is why the
 * shape is region-scoped and never branched on by response code alone.
 *
 * Provenance of these names is the official CLI bundle shipped inside the
 * desktop app (`resources/app.asar.unpacked/cli/dist/codebuddy-lite-wb.mjs`),
 * which declares them as constants and assigns them per request:
 *
 * ```text
 * CONVERSATION_ID_HEADER         = "X-Conversation-ID"
 * CONVERSATION_REQUEST_ID_HEADER = "X-Conversation-Request-ID"
 * CONVERSATION_MESSAGE_ID_HEADER = "X-Conversation-Message-ID"
 * REQUEST_ID_HEADER              = "X-Request-ID"
 * AGENT_INTENT                   = "X-Agent-Intent"
 * IDE_TYPE_HEADER                = "X-IDE-Type"
 * IDE_NAME_HEADER                = "X-IDE-Name"
 * IDE_VERSION_HEADER             = "X-IDE-Version"
 * ```
 *
 * Measured against the live endpoint, the three `X-Conversation-*` headers are
 * the load-bearing set: dropping any one of them reproduces 11128, while
 * `X-Request-ID`, `X-Agent-Intent` and the `X-IDE-*` trio are accepted with or
 * without. They are still sent, because the official client sends them and a
 * gateway that starts checking them later should not see us regress.
 *
 * Every value is minted per request. There is no conversation to continue on
 * this path — the harness owns the message list and replays it in full each
 * turn — so a fresh id per call is the honest mapping, and it is also what the
 * official client does for a brand-new conversation.
 */

import { randomUUID } from 'node:crypto'

/** Headers the international chat endpoint requires; measured, not guessed. */
export const INTERNATIONAL_CONVERSATION_HEADERS = [
  'X-Conversation-ID',
  'X-Conversation-Request-ID',
  'X-Conversation-Message-ID',
] as const

/** Intent the official CLI sends for a normal coding turn. */
const AGENT_INTENT = 'craft'

/** Client shape the official CLI reports; `cli` keeps the gateway's CLI branch. */
const IDE_TYPE = 'cli'
const IDE_NAME = ''
const IDE_VERSION = '0.0.0'

/** One request's conversation identity. */
export interface InternationalIdentity {
  /** Session id, dashed UUID form. */
  conversationId: string
  /** Per-request id, dashed UUID form. */
  requestId: string
  /** Message id, 32 hex chars with the dashes removed. */
  messageId: string
}

/**
 * Mint a conversation identity for one international chat request.
 *
 * The message id is the dashed form stripped, matching the official client's
 * `randomUUID().replace(/-/g, '')`. A gateway that validates the shape rejects
 * the dashed spelling, so the transform is part of the contract rather than a
 * cosmetic choice.
 */
export function mintInternationalIdentity(): InternationalIdentity {
  return {
    conversationId: randomUUID(),
    requestId: randomUUID(),
    messageId: randomUUID().replace(/-/g, ''),
  }
}

/**
 * The headers one international chat request must carry.
 *
 * Returns a fresh object per call: the caller spreads it into the request, and
 * two requests must never share a mutable header map.
 */
export function internationalChatHeaders(): Record<string, string> {
  const identity = mintInternationalIdentity()
  return {
    'X-Conversation-ID': identity.conversationId,
    'X-Conversation-Request-ID': identity.requestId,
    'X-Conversation-Message-ID': identity.messageId,
    'X-Request-ID': identity.messageId,
    'X-Agent-Intent': AGENT_INTENT,
    'X-IDE-Type': IDE_TYPE,
    'X-IDE-Name': IDE_NAME,
    'X-IDE-Version': IDE_VERSION,
  }
}

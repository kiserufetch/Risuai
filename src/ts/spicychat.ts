/**
 * SpicyChat character import — data layer.
 *
 * ============================================================================
 *  STATUS: Step 2 (data layer) implemented on top of Step 1 (API discovery).
 *  Discovery date: 2026-07-06
 * ============================================================================
 *
 * ----------------------------------------------------------------------------
 *  HOW THE API WAS DISCOVERED
 * ----------------------------------------------------------------------------
 * spicychat.ai is a Vite SPA (not Next.js). The homepage HTML references
 * hashed JS bundles under /assets/ (index-*.js, vendor-*.js, common-*.js).
 * Downloading and grepping those bundles surfaced the embedded VITE_* env
 * config, which revealed every backend host:
 *
 *   VITE_API_URL            = https://prod.nd-api.com      (REST API)
 *   VITE_ASSETS_URL         = https://cdn.nd-api.com       (avatar/media CDN)
 *   VITE_TYPESENSE_HOST     = etmzpxgvnid370fyp.a1.typesense.net (catalog search)
 *   VITE_KINDE_DOMAIN       = https://auth.spicychat.ai    (OAuth2/OIDC auth)
 *   VITE_KINDE_CLIENT_ID    = fb5754f42ee84f4787f9bd8ff49cac7a
 *   VITE_KINDE_ORG          = org_7d8efc10ab9
 *   VITE_LOAD_AS_APPLICATION_ID = spicychat
 *
 * NOTE: api.spicychat.ai / gateway.spicychat.ai do NOT resolve. The real API
 * host is `prod.nd-api.com` ("nextday api", the shared backend for SpicyChat /
 * SecretMate / PixelChat). The app id `spicychat` scopes results per-brand.
 *
 * ----------------------------------------------------------------------------
 *  TWO-BACKEND ARCHITECTURE (important for Step 2)
 * ----------------------------------------------------------------------------
 * SpicyChat splits catalog browsing from character detail:
 *
 *  1. CATALOG LIST / SEARCH / FILTER / SORT  -> Typesense (search engine)
 *     Direct browser calls to the Typesense host with a SCOPED search key.
 *     Fully public, CORS `Access-Control-Allow-Origin: *`, no login.
 *
 *  2. CHARACTER DETAIL (full definition) -> REST API (prod.nd-api.com)
 *     GET /v2/characters/{id}. Requires app id + a guest user id header
 *     (anonymous — NO login needed), CORS locked to https://spicychat.ai.
 *
 *  3. AVATAR / MEDIA -> CDN (cdn.nd-api.com). Public, CORS `*`.
 *
 *  4. APP CONFIG (bootstrap) -> GET /v2/applications/spicychat. Returns the
 *     Typesense collection names + SCOPED search keys, tag lists, NSFW policy,
 *     branding, etc. The scoped Typesense key is NOT hardcoded in the bundle;
 *     it is read from this endpoint at runtime (so Step 2 must fetch it here
 *     rather than embedding a key that can rotate).
 *
 * ----------------------------------------------------------------------------
 *  ENDPOINT INVENTORY
 * ----------------------------------------------------------------------------
 *
 *  (A) App config / bootstrap
 *  --------------------------
 *  GET https://prod.nd-api.com/v2/applications/spicychat
 *    Headers: X-App-Id: spicychat
 *    Auth:    none (public)
 *    Returns: {
 *      typesenseSearchKey,                 // global search key (limited)
 *      typesenseConfig: {
 *        collectionNamePublicCharacter,    // e.g. "public_characters_alias"
 *        apiKeyPublicCharacter,            // SCOPED key (embeds filter type!=META)
 *        apiKeyAllPublicCharacters, collectionNameLeaderboard, apiKeyLeaderboard,
 *        collectionNameLorebook, apiKeyLorebook, ...
 *      },
 *      chatbotsTags: { tags: string[] },   // 90 canonical filter tags
 *      lorebookTags: { tags: string[] },
 *      negativeWordsForSearch, isNsfwEnabled, branding, localization, ...
 *    }
 *
 *  (B) Catalog list / search / filter / sort  (Typesense)
 *  ------------------------------------------------------
 *  GET https://etmzpxgvnid370fyp.a1.typesense.net
 *      /collections/{collectionNamePublicCharacter}/documents/search
 *    Headers: x-typesense-api-key: {apiKeyPublicCharacter}   // scoped key from (A)
 *    Query params:
 *      q            = free-text search ("*" for browse-all)
 *      query_by     = name,title,tags   (NOTE: persona/greeting are NOT indexed)
 *      per_page     = page size (catalog uses ~20)
 *      page         = 1-based page number  (pagination)
 *      filter_by    = Typesense filter DSL, joined with " && ":
 *                       is_nsfw:false                 (NSFW toggle)
 *                       tags:=Anime                   (tag/category facet)
 *                       tags:=[Anime,Female]          (multi-tag)
 *                       definition_visible:true       (importable only)
 *      sort_by      = num_messages:desc      (Popular / most chats)
 *                     num_messages_24h:desc  (Trending / hot 24h)
 *                     createdAt:desc         (Newest)  / createdAt:asc (Oldest)
 *                     rating_score:desc      (Top Rated)
 *      facet_by     = tags               (returns tag counts for the tag filter UI)
 *      max_facet_values = N
 *    Alternative: POST /multi_search with body { searches:[{collection, q, ...}] }
 *      and ?x-typesense-api-key=... (the SPA uses the InstantSearch adapter here).
 *    Returns: { found, out_of, page, hits:[{ document:{...list card...} }],
 *               facet_counts:[{ field_name:"tags", counts:[{value,count}] }] }
 *
 *  (C) Character detail (full definition)  (REST)
 *  ----------------------------------------------
 *  GET https://prod.nd-api.com/v2/characters/{id}
 *    Headers (all required for guest access):
 *      X-App-Id:        spicychat
 *      X-Guest-UserId:  <uuid-v4>     // any UUID; client-generated, no login
 *    Optional (logged-in): Authorization: Bearer <access_token> instead of guest.
 *    Auth: WITHOUT X-Guest-UserId (or a Bearer token) -> 401 SC-001-6004.
 *    CORS: Access-Control-Allow-Origin: https://spicychat.ai (NOT `*`) — so web
 *          builds MUST proxy this call (see plan Proxy Strategy). Tauri = native.
 *    Returns SpicyChatCharacterDetail (see type below). Full persona/greeting/
 *    scenario/dialogue only present when definition_visible === true.
 *
 *  (D) Avatar / media  (CDN)
 *  -------------------------
 *  GET https://cdn.nd-api.com/{avatar_url}
 *    where avatar_url is the relative path from list/detail, e.g.
 *    "avatars/544c1abd1230f0360cb0fd179d2f5b24.jpg".
 *    Auth: none. CORS `*`. Returns image bytes (image/png|jpeg).
 *    Sized variants exist (avatar48x48 ... avatar256x256) but the raw path works.
 *
 *  (E) Auth (OPTIONAL — Kinde OAuth2 / OIDC, Authorization Code + PKCE S256)
 *  ------------------------------------------------------------------------
 *  Discovery: https://auth.spicychat.ai/.well-known/openid-configuration
 *    authorization_endpoint = https://auth.spicychat.ai/oauth2/auth
 *    token_endpoint         = https://auth.spicychat.ai/oauth2/token
 *    userinfo_endpoint      = https://auth.spicychat.ai/oauth2/v2/user_profile
 *    end_session_endpoint   = https://auth.spicychat.ai/logout
 *    scopes                 = openid profile email offline
 *    client_id              = fb5754f42ee84f4787f9bd8ff49cac7a
 *  Login is NOT required for the public catalog + detail (guest header path).
 *  Auth only unlocks private/own bots. Token exchange needs an interactive
 *  browser login, so the auth token shape in the fixture is representative.
 *
 *  Other useful REST paths seen in the bundle (not needed for import v1):
 *    GET /v2/characters/{id}/messages         (chat history)
 *    POST /v2/characters/suggest_tags         (tag autocomplete)
 *    POST /v2/users                           (register guest user)
 *    GET  /v2/users                           (current user)
 *
 * ----------------------------------------------------------------------------
 *  FIELD MAPPING (SpicyChat detail -> RisuAI CharacterCardV3.data)
 * ----------------------------------------------------------------------------
 *    name              -> data.name
 *    persona           -> data.description   (SpicyChat's main character def)
 *    greeting          -> data.first_mes
 *    scenario          -> data.scenario
 *    dialogue          -> data.mes_example   (example dialogue; may be "")
 *    tags              -> data.tags          (+ push "nsfw" when is_nsfw)
 *    creator_username  -> data.creator
 *    title             -> data.creator_notes (short tagline)
 *    avatar_url        -> fetch CDN bytes -> card image / data.assets[icon]
 *    id                -> data.extensions.spicychatImportId  (idempotency key)
 *    language / token_count / translated_languages -> data.extensions (info)
 *  All source fields are optional -> parser must default to '' / [] (defensive).
 *
 * ----------------------------------------------------------------------------
 *  Full Endpoint Inventory, Filter/Sort Parity Matrix, Field Mapping Matrix and
 *  the GO/NO-GO decision are recorded in:
 *     .omc/plans/spicychat-import-consensus.md  -> "## Step 1 Results"
 *  Fixtures (real captures) live in:
 *     src/test/fixtures/spicychat/{list,detail,auth}.json
 * ============================================================================
 */

/** Discovered SpicyChat backend hosts (Step 1, 2026-07-06). */
export const SPICYCHAT_HOSTS = {
    /** REST API base (character detail, app config, users). */
    api: 'https://prod.nd-api.com',
    /** Avatar / media CDN base. Prefix relative `avatar_url` with this. */
    cdn: 'https://cdn.nd-api.com',
    /** Typesense search host (public catalog list/search/filter/sort). */
    typesense: 'https://etmzpxgvnid370fyp.a1.typesense.net',
    /** Kinde OAuth2/OIDC auth domain (optional login). */
    auth: 'https://auth.spicychat.ai',
} as const

/** App id that scopes the shared nd-api backend to the SpicyChat brand. */
export const SPICYCHAT_APP_ID = 'spicychat'

/** REST API version prefix used by character/app-config endpoints. */
export const SPICYCHAT_API_VERSION = 'v2'

/**
 * One row of the Typesense catalog search response (`hits[].document`).
 * Only the fields relevant to browse + import are typed; the live payload
 * carries more (name_i18n, moderation_*, text_match, etc). All optional —
 * the Step 2 parser must treat every field defensively.
 */
export interface SpicyChatListDocument {
    id?: string
    character_id?: string
    name?: string
    title?: string
    greeting?: string
    avatar_url?: string
    tags?: string[]
    is_nsfw?: boolean
    avatar_is_nsfw?: boolean
    definition_visible?: boolean
    creator_username?: string
    creator_user_id?: string
    num_messages?: number
    num_messages_24h?: number
    rating_score?: number
    language?: string
    token_count?: number
    createdAt?: number
    updatedAt?: number
    visibility?: string
    type?: string
}

/** Typesense catalog search response envelope. */
export interface SpicyChatListResponse {
    found?: number
    out_of?: number
    page?: number
    hits?: Array<{ document: SpicyChatListDocument }>
    facet_counts?: Array<{
        field_name?: string
        counts?: Array<{ value: string; count: number }>
    }>
}

/**
 * Full character detail from GET /v2/characters/{id}.
 * `persona` / `scenario` / `dialogue` are only populated when
 * `definition_visible === true`.
 */
export interface SpicyChatCharacterDetail {
    id?: string
    type?: string
    name?: string
    title?: string
    visibility?: string
    creator_username?: string
    creator_user_id?: string
    greeting?: string
    persona?: string
    scenario?: string
    dialogue?: string
    avatar_url?: string
    tags?: string[]
    is_nsfw?: boolean
    avatar_is_nsfw?: boolean
    definition_visible?: boolean
    language?: string
    token_count?: number
    translated_languages?: string[]
    lorebooks?: unknown[]
    num_messages?: number
    rating_score?: number
}

// ============================================================================
//  Step 2 implementation
// ============================================================================

import { v4 as uuidv4 } from 'uuid'
import type { CharacterCardV3 } from '@risuai/ccardlib'
import { language } from 'src/lang'
import { isNodeServer, isTauri } from 'src/ts/platform'
import { alertConfirm, alertError, alertStore } from './alert'
import { importCharacterCardSpec } from './characterCards'
import { changeChar } from './characters'
import { checkCharOrder, fetchNative } from './globalApi.svelte'
import { getDatabase, type character } from './storage/database.svelte'
import { DBState } from './stores.svelte'

type SpicyChatHostKey = keyof typeof SPICYCHAT_HOSTS

// Mirror characterCards.ts useHubProxy: the nd-api REST endpoints are CORS-locked
// to https://spicychat.ai, so web dev + node self-host route them through a
// dedicated same-origin proxy (vite.config.ts / server/node/server.cjs).
export const useSpicyChatProxy = isNodeServer || (import.meta.env.DEV && !isTauri)
export const spicyChatBaseURL = useSpicyChatProxy
    ? '/spicychat-proxy'
    : SPICYCHAT_HOSTS.api

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Unified cross-platform HTTP wrapper for all SpicyChat traffic.
 *
 * Routing per platform (see plan "Proxy Strategy"):
 * - REST api host (CORS locked to spicychat.ai):
 *   - Vite dev / node self-host -> same-origin `/spicychat-proxy` (Origin stripped)
 *   - Tauri -> `fetchNative` native HTTP (no CORS)
 *   - Static prod web -> `fetchNative` tunneled through the hub `/proxy2`
 * - Typesense / CDN hosts (CORS `*`): direct fetch on web, native on Tauri.
 *
 * Never uses bare cross-origin `fetch` against the origin-locked REST host.
 */
export async function spicyChatFetch(path: string, opts: {
    method?: 'GET' | 'POST'
    headers?: { [key: string]: string }
    body?: string | Uint8Array
    host?: SpicyChatHostKey
} = {}): Promise<Response> {
    const host = opts.host ?? 'api'
    const method = opts.method ?? 'GET'
    const headers = opts.headers ?? {}
    const absoluteUrl = SPICYCHAT_HOSTS[host] + path

    if (host === 'api' && useSpicyChatProxy) {
        return await fetch(spicyChatBaseURL + path, {
            method,
            headers,
            body: opts.body as BodyInit,
        })
    }
    if (isTauri || host === 'api') {
        // Tauri -> native HTTP. Static prod web api calls -> proxy2 tunnel.
        return await fetchNative(absoluteUrl, {
            method,
            headers,
            body: opts.body,
            logFetch: false,
        })
    }
    // Typesense / CDN respond with `Access-Control-Allow-Origin: *`.
    return await fetch(absoluteUrl, {
        method,
        headers,
        body: opts.body as BodyInit,
    })
}

/** `spicyChatFetch` with a single retry (backoff) on HTTP 429, per plan guardrails. */
async function spicyChatFetchWithRetry(path: string, opts: Parameters<typeof spicyChatFetch>[1] = {}): Promise<Response> {
    let res = await spicyChatFetch(path, opts)
    if (res.status === 429) {
        await sleep(2000)
        res = await spicyChatFetch(path, opts)
    }
    return res
}

// ----------------------------------------------------------------------------
// Guest identity + optional auth (device-local storage, NEVER DBState.db —
// DBState syncs into .bin saves and must not carry third-party tokens)
// ----------------------------------------------------------------------------

const SPICYCHAT_GUEST_ID_KEY = 'risu_spicychat_guest_id'
const SPICYCHAT_AUTH_TOKEN_KEY = 'risu_spicychat_auth_token'

/** Device-local anonymous guest UUID sent as `X-Guest-UserId` (generated once). */
export function getSpicyChatGuestId(): string {
    let id = localStorage.getItem(SPICYCHAT_GUEST_ID_KEY)
    if (!id) {
        id = uuidv4()
        localStorage.setItem(SPICYCHAT_GUEST_ID_KEY, id)
    }
    return id
}

/**
 * Optional Kinde OAuth scaffold. The public catalog + import work fully as
 * guest; a Bearer token (if ever set) only unlocks private/own bots.
 *
 * NOTE: interactive Kinde login (Authorization Code + PKCE) needs a redirect
 * URI registered on SpicyChat's auth tenant, which RisuAI origins are not —
 * so v1 ships token storage/usage only, no login UI. See endpoint (E) docs.
 */
export const spicyChatAuth = {
    getToken(): string | null {
        return localStorage.getItem(SPICYCHAT_AUTH_TOKEN_KEY)
    },
    setToken(token: string) {
        localStorage.setItem(SPICYCHAT_AUTH_TOKEN_KEY, token)
    },
    logout() {
        localStorage.removeItem(SPICYCHAT_AUTH_TOKEN_KEY)
    },
    isLoggedIn(): boolean {
        return !!localStorage.getItem(SPICYCHAT_AUTH_TOKEN_KEY)
    },
}

/** Headers for the nd-api REST endpoints (guest by default, Bearer when logged in). */
function spicyChatApiHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {
        'X-App-Id': SPICYCHAT_APP_ID,
    }
    const token = spicyChatAuth.getToken()
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    else {
        headers['X-Guest-UserId'] = getSpicyChatGuestId()
    }
    return headers
}

// ----------------------------------------------------------------------------
// App config (endpoint A) — source of the Typesense collection alias and the
// SCOPED search key. Both can rotate, so they are fetched at runtime and only
// cached for the session (never hardcoded).
// ----------------------------------------------------------------------------

export interface SpicyChatAppConfig {
    /** Typesense collection (alias) holding the public character catalog. */
    collection: string
    /** Scoped Typesense search key for that collection. */
    searchKey: string
    /** Canonical filter tags (~90) for the tag filter UI. */
    tags: string[]
    isNsfwEnabled: boolean
}

let appConfigPromise: Promise<SpicyChatAppConfig | null> | null = null

export function getSpicyChatAppConfig(): Promise<SpicyChatAppConfig | null> {
    appConfigPromise ??= (async (): Promise<SpicyChatAppConfig | null> => {
        try {
            const res = await spicyChatFetchWithRetry(`/${SPICYCHAT_API_VERSION}/applications/${SPICYCHAT_APP_ID}`, {
                headers: { 'X-App-Id': SPICYCHAT_APP_ID },
            })
            if (res.status === 429) {
                throw new Error(language.spicyChat.rateLimited)
            }
            if (res.status !== 200) {
                throw new Error(`${language.spicyChat.configFailed} (HTTP ${res.status})`)
            }
            const json = await res.json()
            const collection = json?.typesenseConfig?.collectionNamePublicCharacter
            const searchKey = json?.typesenseConfig?.apiKeyPublicCharacter ?? json?.typesenseSearchKey
            if (typeof collection !== 'string' || !collection || typeof searchKey !== 'string' || !searchKey) {
                console.error('Unexpected SpicyChat app config shape', json)
                throw new Error(language.spicyChat.configFailed)
            }
            return {
                collection,
                searchKey,
                tags: Array.isArray(json?.chatbotsTags?.tags) ? json.chatbotsTags.tags.filter((t: unknown) => typeof t === 'string') : [],
                isNsfwEnabled: json?.isNsfwEnabled ?? true,
            }
        } catch (error) {
            console.error(error)
            appConfigPromise = null // allow retrying on the next call
            alertError(error instanceof Error ? error.message : language.spicyChat.configFailed)
            return null
        }
    })()
    return appConfigPromise
}

// ----------------------------------------------------------------------------
// Catalog list / search / filter / sort (endpoint B, Typesense)
// ----------------------------------------------------------------------------

/** UI sort mode -> Typesense `sort_by`, per the live-verified Parity Matrix. */
export const SPICYCHAT_SORTS = {
    popular: 'num_messages:desc',
    trending: 'num_messages_24h:desc',
    newest: 'createdAt:desc',
    oldest: 'createdAt:asc',
    toprated: 'rating_score:desc',
} as const

export type SpicyChatSortMode = keyof typeof SPICYCHAT_SORTS

export interface SpicyChatHubParams {
    search: string
    /** 1-based page number. */
    page: number
    /** When false, `filter_by=is_nsfw:false` is applied (hide NSFW). */
    nsfw: boolean
    sort: SpicyChatSortMode
    tags?: string[]
    perPage?: number
}

export interface SpicyChatHubResult {
    cards: SpicyChatListDocument[]
    found: number
    page: number
    totalPages: number
    perPage: number
    /** Tag facet counts for the tag filter UI badges. */
    tagFacets: { value: string; count: number }[]
}

/** Search/browse the public catalog. Returns null on failure (already alerted). */
export async function getSpicyChatHub(params: SpicyChatHubParams): Promise<SpicyChatHubResult | null> {
    const config = await getSpicyChatAppConfig()
    if (!config) {
        return null // getSpicyChatAppConfig already alerted
    }
    try {
        const perPage = params.perPage ?? 20
        const search = params.search?.trim() ?? ''
        const filters: string[] = []
        if (!params.nsfw) {
            filters.push('is_nsfw:false')
        }
        const tags = (params.tags ?? []).filter((t) => !!t)
        if (tags.length === 1) {
            filters.push(`tags:=${tags[0]}`)
        }
        else if (tags.length > 1) {
            filters.push(`tags:=[${tags.join(',')}]`)
        }
        const query = new URLSearchParams({
            q: search === '' ? '*' : search,
            query_by: 'name,title,tags',
            page: String(Math.max(1, Math.floor(params.page) || 1)),
            per_page: String(perPage),
            sort_by: SPICYCHAT_SORTS[params.sort] ?? SPICYCHAT_SORTS.popular,
            facet_by: 'tags',
            max_facet_values: '100',
        })
        if (filters.length > 0) {
            query.set('filter_by', filters.join(' && '))
        }
        const res = await spicyChatFetchWithRetry(
            `/collections/${encodeURIComponent(config.collection)}/documents/search?${query.toString()}`,
            {
                host: 'typesense',
                headers: { 'x-typesense-api-key': config.searchKey },
            },
        )
        if (res.status === 429) {
            alertError(language.spicyChat.rateLimited)
            return null
        }
        if (res.status !== 200) {
            alertError(`${language.spicyChat.loadFailed} (HTTP ${res.status})`)
            return null
        }
        const json: SpicyChatListResponse = await res.json()
        if (!json || !Array.isArray(json.hits)) {
            console.error('Unexpected SpicyChat list response shape', json)
            alertError(language.spicyChat.loadFailed)
            return null
        }
        const cards = json.hits.map((h) => h?.document).filter((d): d is SpicyChatListDocument => !!d)
        const found = typeof json.found === 'number' ? json.found : cards.length
        const tagFacets = json.facet_counts?.find((f) => f?.field_name === 'tags')?.counts ?? []
        return {
            cards,
            found,
            page: json.page ?? params.page,
            totalPages: Math.max(1, Math.ceil(found / perPage)),
            perPage,
            tagFacets,
        }
    } catch (error) {
        console.error(error)
        alertError(language.spicyChat.loadFailed)
        return null
    }
}

// ----------------------------------------------------------------------------
// Character detail (endpoint C, REST — origin-locked, guest headers required)
// ----------------------------------------------------------------------------

/** Full character detail for preview + import. Returns null on failure (already alerted). */
export async function getSpicyChatCharacter(id: string): Promise<SpicyChatCharacterDetail | null> {
    try {
        const res = await spicyChatFetchWithRetry(`/${SPICYCHAT_API_VERSION}/characters/${encodeURIComponent(id)}`, {
            headers: spicyChatApiHeaders(),
        })
        if (res.status === 429) {
            alertError(language.spicyChat.rateLimited)
            return null
        }
        if (res.status !== 200) {
            alertError(`${language.spicyChat.loadFailed} (HTTP ${res.status})`)
            return null
        }
        const json = await res.json()
        if (!json || typeof json !== 'object' || (!json.name && !json.id)) {
            console.error('Unexpected SpicyChat detail response shape', json)
            alertError(language.spicyChat.loadFailed)
            return null
        }
        return json as SpicyChatCharacterDetail
    } catch (error) {
        console.error(error)
        alertError(language.spicyChat.loadFailed)
        return null
    }
}

// ----------------------------------------------------------------------------
// Avatar / media (endpoint D, CDN)
// ----------------------------------------------------------------------------

function fetchSpicyChatImage(url: string): Promise<Response> {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.startsWith(SPICYCHAT_HOSTS.cdn + '/')) {
            return spicyChatFetch(url.slice(SPICYCHAT_HOSTS.cdn.length), { host: 'cdn' })
        }
        // Foreign absolute URL: native HTTP on Tauri, direct on web.
        return isTauri
            ? fetchNative(url, { method: 'GET', logFetch: false })
            : fetch(url)
    }
    return spicyChatFetch(url.startsWith('/') ? url : '/' + url, { host: 'cdn' })
}

/** Avatar bytes for the import pipeline. Undefined when unavailable (import continues without image). */
export async function getSpicyChatAvatarBytes(avatarUrl: string | undefined): Promise<Uint8Array | undefined> {
    if (!avatarUrl) {
        return undefined
    }
    try {
        const res = await fetchSpicyChatImage(avatarUrl)
        if (res.status !== 200) {
            return undefined
        }
        return new Uint8Array(await res.arrayBuffer())
    } catch (error) {
        console.error(error)
        return undefined
    }
}

/**
 * Fetches an avatar and returns a revocable blob object URL for `<img src>`.
 * Callers must `URL.revokeObjectURL()` it on unmount. Returns null on failure
 * (UI shows a placeholder instead).
 */
export async function spicyChatImageBlobUrl(url: string | undefined): Promise<string | null> {
    if (!url) {
        return null
    }
    try {
        const res = await fetchSpicyChatImage(url)
        if (res.status !== 200) {
            return null
        }
        return URL.createObjectURL(await res.blob())
    } catch (error) {
        console.error(error)
        return null
    }
}

// ----------------------------------------------------------------------------
// Import (Field Mapping Matrix -> CharacterCardV3 -> importCharacterCardSpec)
// ----------------------------------------------------------------------------

/**
 * Pure mapping of a SpicyChat detail record to a RisuAI `CharacterCardV3`,
 * per the Step 1 Field Mapping Matrix. All source fields are optional and
 * default to '' / [] (defensive parser rule).
 */
export function parseSpicyChatDetailToCard(detail: SpicyChatCharacterDetail): CharacterCardV3 {
    const tags = Array.isArray(detail.tags) ? detail.tags.filter((t): t is string => typeof t === 'string') : []
    if (detail.is_nsfw && !tags.some((t) => t.toLowerCase() === 'nsfw')) {
        tags.push('nsfw')
    }
    return {
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: {
            name: detail.name ?? '',
            description: detail.persona ?? '',
            first_mes: detail.greeting ?? '',
            scenario: detail.scenario ?? '',
            mes_example: detail.dialogue ?? '',
            personality: '',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],
            group_only_greetings: [],
            tags,
            creator: detail.creator_username ?? '',
            creator_notes: detail.title ?? '',
            character_version: '',
            source: detail.id ? [`https://spicychat.ai/chat/${detail.id}`] : [],
            extensions: {
                spicychatImportId: detail.id ?? '',
                spicychat: {
                    language: detail.language ?? '',
                    token_count: detail.token_count ?? 0,
                    translated_languages: Array.isArray(detail.translated_languages) ? detail.translated_languages : [],
                    definition_visible: detail.definition_visible ?? true,
                },
            },
        },
    }
}

/** Index of an already-imported SpicyChat character in `DBState.db.characters`, or -1. */
export function findImportedSpicyChatCharacter(id: string): number {
    return DBState.db.characters.findIndex((c) => c.type !== 'group' && (c as character).extentions?.spicychatImportId === id)
}

/**
 * Downloads + imports a SpicyChat character (mirrors `downloadRisuHub`, but
 * goes through `importCharacterCardSpec(..., 'normal')` — never 'hub', and
 * never `alertTOS()` which are Realm-specific).
 */
export async function downloadSpicyChatCharacter(id: string) {
    try {
        if (!id) {
            return
        }
        const existingIndex = findImportedSpicyChatCharacter(id)
        if (existingIndex !== -1) {
            const conf = await alertConfirm(language.spicyChat.alreadyImported)
            if (conf) {
                changeChar(existingIndex)
            }
            return
        }
        alertStore.set({
            type: 'wait',
            msg: 'Downloading...',
        })
        const detail = await getSpicyChatCharacter(id)
        if (!detail) {
            return // already alerted
        }
        const card = parseSpicyChatDetailToCard(detail)
        const avatarBytes = await getSpicyChatAvatarBytes(detail.avatar_url)
        const imported = await importCharacterCardSpec(card, avatarBytes, 'normal')
        if (!imported) {
            alertError(language.spicyChat.loadFailed)
            return
        }
        checkCharOrder()
        const db = getDatabase()
        if (db.characters[db.characters.length - 1] && db.goCharacterOnImport) {
            changeChar(db.characters.length - 1)
        }
    } catch (error) {
        console.error(error)
        alertError(language.spicyChat.loadFailed)
    }
}

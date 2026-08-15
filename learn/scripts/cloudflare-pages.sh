#!/usr/bin/env bash
# Idempotent Cloudflare Pages bootstrap for learn.theairuntime.com.
#
# Everything here is safe to run repeatedly: each step checks the current state
# first and does nothing when the resource already exists. That is what lets CI
# call it on every deploy without drifting.
#
# Usage:
#   ./cloudflare-pages.sh ensure-project    # create the Pages project if missing
#   ./cloudflare-pages.sh ensure-domain     # attach the custom domain + DNS record
#
# Required environment:
#   CLOUDFLARE_API_TOKEN   custom token, see learn/DEPLOY.md for the four scopes
#   CLOUDFLARE_ACCOUNT_ID  account id, not a secret
set -euo pipefail

PROJECT="${PAGES_PROJECT:-learn-theairuntime}"
DOMAIN="${PAGES_DOMAIN:-learn.theairuntime.com}"
ZONE="${PAGES_ZONE:-theairuntime.com}"
BRANCH="${PAGES_PRODUCTION_BRANCH:-main}"
API="https://api.cloudflare.com/client/v4"

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"

cf() {
  # cf <method> <path> [json body]. Prints the response body, never the token.
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$API$path"
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
    -H "Content-Type: application/json")
  [ -n "$body" ] && args+=(--data "$body")
  curl "${args[@]}"
}

die() { echo "error: $*" >&2; exit 1; }

ensure_project() {
  if cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT" |
      jq -e '.success == true' >/dev/null; then
    echo "project $PROJECT already exists"
    return
  fi

  echo "creating project $PROJECT"
  local out
  out=$(cf POST "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" \
    "$(jq -nc --arg n "$PROJECT" --arg b "$BRANCH" \
        '{name: $n, production_branch: $b}')")

  jq -e '.success == true' <<<"$out" >/dev/null ||
    die "could not create project: $(jq -c '.errors' <<<"$out")"
  echo "created $PROJECT"
}

ensure_domain() {
  local out
  out=$(cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/domains")

  if jq -e --arg d "$DOMAIN" '.result[]? | select(.name == $d)' <<<"$out" >/dev/null; then
    echo "domain $DOMAIN already attached"
  else
    echo "attaching $DOMAIN to $PROJECT"
    out=$(cf POST "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/domains" \
      "$(jq -nc --arg n "$DOMAIN" '{name: $n}')")
    jq -e '.success == true' <<<"$out" >/dev/null ||
      die "could not attach domain: $(jq -c '.errors' <<<"$out")"
  fi

  # Pages needs a CNAME pointing at the project. The dashboard creates this for
  # you; the API does not, so do it here when it is missing.
  local zone_id
  zone_id=$(cf GET "/zones?name=$ZONE" | jq -r '.result[0].id // empty')
  [ -n "$zone_id" ] || die "zone $ZONE not found, check the token's Zone:Read scope"

  if cf GET "/zones/$zone_id/dns_records?name=$DOMAIN" |
      jq -e '(.result | length) > 0' >/dev/null; then
    echo "dns record for $DOMAIN already exists"
    return
  fi

  echo "creating CNAME $DOMAIN -> $PROJECT.pages.dev"
  out=$(cf POST "/zones/$zone_id/dns_records" \
    "$(jq -nc --arg n "$DOMAIN" --arg c "$PROJECT.pages.dev" \
        '{type: "CNAME", name: $n, content: $c, proxied: true}')")
  jq -e '.success == true' <<<"$out" >/dev/null ||
    die "could not create dns record: $(jq -c '.errors' <<<"$out")"
  echo "dns record created"
}

case "${1:-}" in
  ensure-project) ensure_project ;;
  ensure-domain)  ensure_domain ;;
  *) die "usage: $0 {ensure-project|ensure-domain}" ;;
esac

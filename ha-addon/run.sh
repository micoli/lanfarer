#!/bin/sh
set -e

OPTIONS=/data/options.json

export NODE_ENV=production
export CUDY_CONFIG=/data/config.yaml
export SESSIONS_FILE=/data/sessions.json

bbox_target=$(jq -r '.bbox_target // empty' "$OPTIONS")
bbox_host=$(jq -r '.bbox_host // empty' "$OPTIONS")
verbose=$(jq -r '.verbose // false' "$OPTIONS")
router_config=$(jq -r '.router_config // empty' "$OPTIONS")

[ -n "$bbox_target" ]  && export BBOX_TARGET="$bbox_target"
[ -n "$bbox_host" ]    && export BBOX_HOST="$bbox_host"
[ "$verbose" = "true" ] && export BBOX_VERBOSE=1

if [ -n "$router_config" ]; then
  echo "$router_config" > "$CUDY_CONFIG"
fi

# Derive ingress base path from HOSTNAME (8f828f58-lanfarer → /8f828f58_lanfarer)
export BASE_PATH="/${HOSTNAME%%-*}_${HOSTNAME#*-}"

export TSX_TSCONFIG_PATH=/app/tsconfig.node.json
exec /app/node_modules/.bin/tsx /app/server/index.ts

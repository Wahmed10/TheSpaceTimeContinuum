#!/usr/bin/env bash
set -euo pipefail

# Run the immutable reference and candidate sequentially on this same machine.
# Never replace the reference with the candidate or ignore environment checks.
root_dir="$(pwd)"
report_dir="$root_dir/.tools"
mode="${CPU_MODE:-compare}"
reference_dir="$report_dir/cpu-reference-checkout"
server_pid=''
mkdir -p "$report_dir"

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill -- "-$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
    server_pid=''
  fi
}
trap cleanup EXIT

capture() {
  local checkout="$1" port="$2" label="$3"
  local baseline="${4:-}"
  local log="$report_dir/cpu-$label-server.log"
  pushd "$checkout" >/dev/null
  # A separate process group lets cleanup stop pnpm AND its Next descendants.
  setsid env PORT="$port" pnpm dev >"$log" 2>&1 &
  server_pid=$!
  popd >/dev/null
  local ready=false
  for attempt in $(seq 1 90); do
    if curl --silent --fail "http://localhost:$port" >/dev/null; then
      ready=true
      break
    fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then cat "$log"; return 1; fi
  local options=(--url "http://localhost:$port" --output "$report_dir/cpu-$label.json")
  if [[ -n "$baseline" ]]; then options+=(--baseline "$baseline"); fi
  (cd "$checkout" && pnpm perf:cpu "${options[@]}")
  cleanup
}

case "$mode" in
  compare)
    expected_reference='1a77315050f0407220cda1237f1284a30afeede1'
    actual_reference="$(git -C "$reference_dir" rev-parse HEAD)"
    if [[ "$actual_reference" != "$expected_reference" ]]; then
      echo 'CPU reference checkout does not match the reviewed immutable commit' >&2
      exit 1
    fi
    printf '{"referenceCommit":"%s","candidateCommit":"%s","method":"sequential reference and candidate on same runner"}\n' \
      "$actual_reference" "$(git rev-parse HEAD)" >"$report_dir/cpu-provenance.json"
    capture "$reference_dir" 3001 reference
    capture "$root_dir" 3000 current "$report_dir/cpu-reference.json"
    ;;
  record) capture "$root_dir" 3000 current ;;
  *) echo "Unknown CPU mode: $mode" >&2; exit 1 ;;
esac
